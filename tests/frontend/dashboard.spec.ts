import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { apiAs, fixture, signIn } from './fixtures';
import { assertAccessible, assertFitsViewport } from './stage7-helpers';
import type { DashboardResponse } from '../../frontend/src/features/dashboard/dashboard-model';
const backendRequire = createRequire(resolve(__dirname, '../../backend/package.json'));
const { Pool } = backendRequire('pg');
const period = 'inicio=2003-03-13&fim=2003-03-13';
async function read(perfil: 'consulta' | 'edicao', query = period): Promise<DashboardResponse> {
  const response = await apiAs(perfil, 'GET', `/dashboard?${query}`); expect(response.status).toBe(200);
  return await response.json() as DashboardResponse;
}
async function displayed(page: Page, data: DashboardResponse) {
  for (const [key, title] of [['pacientes', 'Pacientes autorizados'], ['atendimentos', 'Atendimentos realizados'],
    ['pendencias', 'Pendências abertas'], ['lotes', 'Lotes de importação concluídos']] as const) {
    const card = page.getByRole('group', { name: title, exact: true });
    if (data.indicadores[key].estado === 'sem_permissao') await expect(card).toContainText('Sem permissão');
    else await expect(card.getByLabel(`${title}: ${data.indicadores[key].valor!.toLocaleString('pt-BR')}`, { exact: true })).toBeVisible();
  }
}

test('8B1 quatro indicadores reais com fixture conhecida, filtros URL e visual responsivo', async ({ page }, info) => {
  const owner = new Pool({ host: process.env.PGHOST, port: Number(process.env.PGPORT), user: process.env.PGUSER,
    password: process.env.PGPASSWORD, database: process.env.FRONTEND_E2E_DB });
  let granted: string | undefined;
  try {
    // Verify the actual destination before any fixture write.
    const actual = (await owner.query('SELECT current_database() AS db')).rows[0].db;
    expect(actual).toBe(process.env.FRONTEND_E2E_DB);
    expect(actual).toMatch(/^etapa6_frontend_\d+_\d+_[a-f0-9]{6}$/);
    const active = await owner.query('SELECT 1 FROM ambulatorio.dashboard_importacao_leitor WHERE usuario_id=$1 AND revogado_em IS NULL', [fixture.users.edicao.usuarioId]);
    if (!active.rowCount) granted = (await owner.query('INSERT INTO ambulatorio.dashboard_importacao_leitor(usuario_id) VALUES($1) RETURNING dashboard_importacao_leitor_id::text AS id', [fixture.users.edicao.usuarioId])).rows[0].id;
    const before = await read('edicao');
    const patients: string[] = [];
    for (const index of [0, 1]) {
      const response = await apiAs('edicao', 'POST', '/pacientes', { nome: `Indicador ${index} exclusivamente sintético ${randomUUID()}` });
      expect(response.status).toBe(201); const patient = await response.json() as { pacienteId: string }; patients.push(patient.pacienteId);
      const attendance = await apiAs('edicao', 'POST', `/pacientes/${patient.pacienteId}/atendimentos`, {
        dataAtendimento: index === 0 ? '2003-03-13' : '2003-03-14',
        pendencias: [{ descricao: `Pendência dashboard sintética ${index}`, status: index === 0 ? 'aberta' : 'em_andamento' }],
      });
      expect(attendance.status).toBe(201);
    }
    const lot = (await owner.query(`INSERT INTO ambulatorio.importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote,finalizado_em)
      VALUES($1,$2,'dashboard_e2e_sintetico','concluido','2003-03-13 23:59:59') RETURNING importacao_lote_id::text AS id`,
    [`dashboard-e2e-${randomUUID()}`, randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', '')])).rows[0].id;
    const line = (await owner.query(`INSERT INTO ambulatorio.importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha)
      VALUES($1,'Sintética',1,2,'[]','importada') RETURNING importacao_linha_id::text AS id`, [lot])).rows[0].id;
    await owner.query(`INSERT INTO ambulatorio.importacao_registro(importacao_linha_id,tabela_destino,registro_id,acao) VALUES($1,'paciente',$2,'associado')`, [line, patients[0]]);
    const after = await read('edicao');
    expect(after.indicadores.pacientes.valor).toBe(before.indicadores.pacientes.valor! + 2);
    expect(after.indicadores.atendimentos.valor).toBe(before.indicadores.atendimentos.valor! + 1);
    expect(after.indicadores.pendencias.valor).toBe(before.indicadores.pendencias.valor! + 2);
    expect(after.indicadores.lotes.valor).toBe(before.indicadores.lotes.valor! + 1);
    await signIn(page, 'edicao', `/dashboard?${period}`); await displayed(page, after);
    await expect(page.getByText(/Período aplicado:/)).toContainText('13/03/2003 a 13/03/2003');
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 }); await assertFitsViewport(page); await assertAccessible(page);
      await page.screenshot({ path: info.outputPath(`dashboard-indicadores-${width}.png`), fullPage: true });
    }
    await page.getByLabel('Data inicial', { exact: true }).fill('2003-03-14');
    await page.getByLabel('Data final', { exact: true }).fill('2003-03-14');
    await page.getByRole('button', { name: 'Aplicar período', exact: true }).click();
    await expect(page).toHaveURL(/inicio=2003-03-14&fim=2003-03-14/);
    const changed = await read('edicao', 'inicio=2003-03-14&fim=2003-03-14');
    await displayed(page, changed);
    expect(changed.indicadores.pacientes.valor).toBe(after.indicadores.pacientes.valor);
    expect(changed.indicadores.pendencias.valor).toBe(after.indicadores.pendencias.valor);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole('navigation', { name: 'Menu principal', exact: true }).getByRole('link', { name: 'Início', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Início', exact: true })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Pacientes autorizados', exact: true })).toBeVisible();
    await page.getByRole('link', { name: /Consultar pacientes/ }).click();
    await expect(page.getByRole('heading', { name: 'Pacientes', exact: true })).toBeVisible();
  } finally {
    if (granted) await owner.query('UPDATE ambulatorio.dashboard_importacao_leitor SET revogado_em=clock_timestamp(),revogado_por_principal=session_user WHERE dashboard_importacao_leitor_id=$1', [granted]);
    await owner.end();
  }
});

test('8B1 falta de capacidade, zero autorizado, carga e erro não exibem contagem anterior', async ({ page }, info) => {
  await signIn(page, 'consulta', `/?${period}`);
  const current = await read('consulta'); await displayed(page, current);
  const lots = page.getByRole('group', { name: 'Lotes de importação concluídos', exact: true });
  await expect(lots).toContainText('Sem permissão'); await expect(lots.locator('.dashboard-value')).toHaveCount(0);
  await page.getByLabel('Data inicial', { exact: true }).fill('1001-01-01');
  await page.getByLabel('Data final', { exact: true }).fill('1001-01-01');
  await page.getByRole('button', { name: 'Aplicar período', exact: true }).click();
  await expect(page.getByLabel('Atendimentos realizados: 0', { exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Atendimentos realizados', exact: true })).toContainText('Nenhum registro no recorte autorizado');
  await page.setViewportSize({ width: 390, height: 900 });
  await page.screenshot({ path: info.outputPath('dashboard-vazio-sem-permissao-390.png'), fullPage: true });
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/v1/dashboard**', async route => { await gate; await route.continue(); });
  await page.getByRole('button', { name: 'Atualizar indicadores', exact: true }).click();
  await expect(page.getByText('Carregando…', { exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Pacientes autorizados', exact: true })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('dashboard-carregando-390.png'), fullPage: true });
  release(); await displayed(page, await read('consulta', 'inicio=1001-01-01&fim=1001-01-01'));
  await page.unroute('**/v1/dashboard**');
  // Only transport failures are simulated; indicator populations always came from PostgreSQL.
  await page.route('**/v1/dashboard**', route => route.abort('failed'));
  await page.getByRole('button', { name: 'Atualizar indicadores', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar');
  await expect(page.getByRole('group', { name: 'Pacientes autorizados', exact: true })).toHaveCount(0);
  await assertFitsViewport(page); await assertAccessible(page);
  await page.screenshot({ path: info.outputPath('dashboard-erro-390.png'), fullPage: true });
});
