import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import type { RastreioFamiliarResponse } from '../../frontend/src/api/contracts';
import { apiJson, assertAccessible, seedAttendance, seedPatient, signIn } from './stage7-helpers';

const requireBackend = createRequire(resolve(__dirname, '../../backend/package.json'));
const { Pool } = requireBackend('pg');

test('R7-01: 30/50 familiares por snapshot, erro da segunda página, voltar e recarregar', async ({ page }, testInfo) => {
  test.setTimeout(100_000);
  const patient = await seedPatient('Familiares trinta cinquenta');
  const attendance = await seedAttendance(patient.path, { rastreioFamiliar: { familiaresExaminados: true,
    familiares: Array.from({ length: 30 }, (_, index) => ({ familiar: `Trinta familiar navegador ${index + 1}`,
      resultado: `Sorologia trinta ${index + 1}` })),
  } });
  // A UI cria um snapshot por atendimento. O segundo snapshot sintético valida
  // a leitura do histórico existente sem inventar um novo contrato de escrita.
  const owner = new Pool({ host: process.env.PGHOST, port: Number(process.env.PGPORT), user: process.env.PGUSER,
    password: process.env.PGPASSWORD, database: process.env.FRONTEND_E2E_DB });
  const client = await owner.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`INSERT INTO ambulatorio.rastreio_familiar(paciente_id,atendimento_id,familiares_examinados)
      VALUES($1,$2,true) RETURNING rastreio_familiar_id::text`, [patient.pacienteId, attendance.atendimentoId]);
    await client.query(`INSERT INTO ambulatorio.rastreio_familiar_resultado(rastreio_familiar_id,identificacao_familiar,resultado_sorologia)
      SELECT $1,'Cinquenta familiar navegador '||n,'Sorologia cinquenta '||n FROM generate_series(1,50) n`,
    [result.rows[0].rastreio_familiar_id]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); await owner.end(); }
  const base = `${attendance.path}/rastreios-familiares`;
  const snapshots = await apiJson<RastreioFamiliarResponse[]>('GET', `${base}?limit=2&offset=0`);
  expect(snapshots).toHaveLength(2);
  const [thirty, fifty] = snapshots;
  const destination = `${attendance.path}?familiaresLimit=1&familiaresOffset=0&limit=1&offset=0`;
  const writes: string[] = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname.includes('/rastreios-familiares') && request.method() !== 'GET') writes.push(request.url());
  });
  await signIn(page, 'consulta', destination);
  await expect(page.getByText('Trinta familiar navegador 1', { exact: true })).toBeVisible();
  await expect(page.getByText('Cinquenta familiar navegador 1', { exact: true })).toHaveCount(0);
  const thirtyPages = page.getByRole('navigation', { name: `Paginação de familiares do rastreio ${thirty.rastreioFamiliarId}` });
  await thirtyPages.getByRole('button', { name: 'Próxima', exact: true }).click();
  await expect(page.getByText('Trinta familiar navegador 30', { exact: true })).toBeVisible();
  await expect(page.getByText('Trinta familiar navegador 1', { exact: true })).toHaveCount(0);
  await page.getByRole('navigation', { name: 'Paginação de rastreios familiares' })
    .getByRole('button', { name: 'Próxima', exact: true }).click();
  await expect(page.getByText('Cinquenta familiar navegador 1', { exact: true })).toBeVisible();
  const fiftyPages = page.getByRole('navigation', { name: `Paginação de familiares do rastreio ${fifty.rastreioFamiliarId}` });
  let failRead = true;
  await page.route(`**/v1${base}/${fifty.rastreioFamiliarId}/familiares?**`, async route => {
    if (failRead && new URL(route.request().url()).searchParams.get('offset') === '20') await route.abort('connectionreset');
    else await route.continue();
  });
  await fiftyPages.getByRole('button', { name: 'Próxima', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByText('Nenhum familiar nesta página do rastreio.', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Cinquenta familiar navegador 1', { exact: true })).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get(`familiares${fifty.rastreioFamiliarId}Offset`)).toBe('20');
  failRead = false;
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByText('Cinquenta familiar navegador 40', { exact: true })).toBeVisible();
  await fiftyPages.getByRole('button', { name: 'Próxima', exact: true }).click();
  await expect(page.getByText('Cinquenta familiar navegador 50', { exact: true })).toBeVisible();
  await expect(fiftyPages.getByRole('button', { name: 'Próxima', exact: true })).toBeDisabled();
  await assertAccessible(page);
  await page.screenshot({ path: testInfo.outputPath('familiares-cinquenta-pagina-final.png'), fullPage: true });
  await page.goBack();
  await expect(page.getByText('Cinquenta familiar navegador 40', { exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByText('Cinquenta familiar navegador 1', { exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByText('Trinta familiar navegador 30', { exact: true })).toBeVisible();
  const restored = new URL(page.url());
  expect(restored.pathname).toBe(attendance.path);
  expect(restored.searchParams.get('familiaresOffset')).toBe('0');
  expect(restored.searchParams.get(`familiares${thirty.rastreioFamiliarId}Offset`)).toBe('20');
  expect(restored.searchParams.get('offset')).toBe('0');
  await page.reload();
  await expect(page.getByLabel('Usuário', { exact: true })).toBeVisible();
  await signIn(page, 'consulta', `${restored.pathname}${restored.search}`);
  await expect(page.getByText('Trinta familiar navegador 30', { exact: true })).toBeVisible();
  expect(writes).toEqual([]);
});
