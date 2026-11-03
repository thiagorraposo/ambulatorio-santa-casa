import { expect, test } from '@playwright/test';
import { assertAccessible, assertFitsViewport, seedAttendance, seedPatient, signIn, visitByLink } from './stage7-helpers';

test('M3 visual: ficha, formulários e recursos existentes em 1440 e 390 px com API real', async ({ page }, info) => {
  test.setTimeout(240_000);
  const patient = await seedPatient('Comparação oficial', { dataNascimento: '1980-02-10' });
  const attendance = await seedAttendance(patient.path);
  await signIn(page, 'administracao', patient.path);
  let writes = 0;
  page.on('request', request => { if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method()) && new URL(request.url()).pathname.startsWith('/v1/pacientes')) writes++; });
  const capture = async (name: string) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('Carregando…', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('alert')).toHaveCount(0);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 1440 ? 960 : 844 });
      await assertFitsViewport(page); await assertAccessible(page);
      await page.screenshot({ path: info.outputPath(`ui-${name}-${width}.png`), fullPage: true });
    }
    await page.setViewportSize({ width: 1440, height: 960 });
  };
  await capture('ficha');
  await visitByLink(page, `${patient.path}/editar`); await capture('paciente-editar');
  await visitByLink(page, patient.path);
  for (const [section, label] of [['atendimentos', 'Atendimentos'], ['exames', 'Exames'], ['projetos', 'Projetos'], ['bzn', 'BZN e retornos'], ['notificacao', 'Notificação']] as const) {
    await page.getByRole('navigation', { name: 'Seções da ficha', exact: true }).getByRole('link', { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`aba=${section}`)); await capture(section);
  }
  await page.getByRole('navigation', { name: 'Seções da ficha', exact: true }).getByRole('link', { name: 'Atendimentos', exact: true }).click();
  await expect(page).toHaveURL(/aba=atendimentos/);
  await expect(page.getByRole('table')).toBeVisible();
  await visitByLink(page, attendance.path); await capture('atendimento-detalhe');
  for (const [suffix, create] of [['sorologias', 'nova'], ['condicao-chagas', 'nova'], ['comorbidades', 'nova'], ['complicacoes-chagas', 'nova'], ['medicamentos', null]] as const) {
    const path = `${attendance.path}/${suffix}`;
    await visitByLink(page, path); await capture(suffix);
    if (create) { await visitByLink(page, `${path}/${create}`); await capture(`${suffix}-formulario`); await visitByLink(page, path); }
    await visitByLink(page, attendance.path);
  }
  for (const suffix of ['avcs', 'dispositivos', 'obito']) {
    const path = `${patient.path}/${suffix}`;
    await visitByLink(page, path); await capture(suffix);
    await visitByLink(page, `${path}/nova`); await capture(`${suffix}-formulario`);
    await visitByLink(page, path); await visitByLink(page, attendance.path);
  }
  const menu = page.getByRole('navigation', { name: 'Menu principal', exact: true });
  for (const label of ['Pacientes', 'Importações', 'Usuários', 'Minha conta', 'Início']) {
    await menu.getByRole('link', { name: label, exact: true }).click(); await capture(label);
  }
  expect(writes).toBe(0);
});
