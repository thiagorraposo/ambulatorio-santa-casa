import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { apiAs, fixture, signIn } from './fixtures';
import { apiJson, assertAccessible, assertFitsViewport, seedAttendance, seedPatient } from './stage7-helpers';
import type { DashboardResponse } from '../../frontend/src/features/dashboard/dashboard-model';

// One isolated synthetic population makes filter combinations and CSV scope measurable.
const marker = `EnsaioFinal${randomUUID().slice(0, 8)}`;
const formulaName = `=1+1 ${marker}, "Árvore sintética"`;
const period = { inicio: '2004-03-01', fim: '2004-03-31' };
let patient: { pacienteId: string; path: string };
let restrictedId: string;
let project: { id: string; nome: string };

const menu = (page: Page) => page.getByRole('navigation', { name: 'Menu principal', exact: true });
const results = (page: Page) => page.getByRole('table', { name: 'Atendimentos encontrados', exact: true });

async function capture(page: Page, info: TestInfo, label: string) {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 1440 ? 960 : 844 });
    await assertFitsViewport(page);
    await assertAccessible(page);
    await page.screenshot({ path: info.outputPath(`${label}-${width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 960 });
}

async function exportDashboard(page: Page) {
  await page.getByRole('button', { name: 'Exportar CSV', exact: true }).click();
  const responseEvent = page.waitForResponse(item => new URL(item.url()).pathname === '/v1/dashboard/export.csv');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Confirmar exportação CSV', exact: true }).click();
  const response = await responseEvent;
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('text/csv');
  const download = await downloadEvent;
  expect(await download.failure()).toBeNull();
  const bytes = await readFile((await download.path())!);
  const text = bytes.toString('utf8').replace(/^\uFEFF/, '');
  expect(text).toBe(await response.text());
  expect(text).toMatch(/^paciente_id,nome,atendimento_id,data_atendimento,pendencias_abertas\r?\n/);
  return { text, request: new URL(response.url()) };
}

async function applyCombinedFilters(page: Page) {
  await page.getByLabel('Data inicial', { exact: true }).fill(period.inicio);
  await page.getByLabel('Data final', { exact: true }).fill(period.fim);
  await page.getByLabel('Nome do paciente', { exact: true }).fill(marker);
  await page.getByLabel('Sexo', { exact: true }).selectOption('feminino');
  await page.getByLabel('Projeto', { exact: true }).selectOption(project.id);
  await page.getByLabel('Status da pendência', { exact: true }).selectOption('aberta');
  await page.getByLabel('Ordenação', { exact: true }).selectOption('data_asc');
  const responseEvent = page.waitForResponse(item => {
    const url = new URL(item.url());
    return url.pathname === '/v1/dashboard' && url.searchParams.get('nome') === marker
      && url.searchParams.get('projetoId') === project.id && url.searchParams.get('ordenacao') === 'data_asc';
  });
  await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
  const response = await responseEvent;
  expect(response.status()).toBe(200);
  return await response.json() as DashboardResponse;
}

test.beforeAll(async () => {
  const projects = await apiJson<Array<{ id: string; nome: string }>>('GET', '/catalogos/projetos?limit=100');
  expect(projects.length).toBeGreaterThan(0);
  project = projects[0]!;
  patient = await seedPatient('Ensaio final filtros', { nome: formulaName, sexo: 'feminino' });
  await apiJson('PUT', `${patient.path}/projetos`, { projetoId: project.id, participa: true });
  for (const dataAtendimento of ['2004-03-13', '2004-03-14']) {
    await seedAttendance(patient.path, { dataAtendimento,
      pendencias: [{ descricao: `${marker} pendência exclusivamente sintética`, status: 'aberta' }] });
  }
  const excluded = await seedPatient('Ensaio final sexo excluído', { nome: `${marker} sexo excluído`, sexo: 'masculino' });
  await seedAttendance(excluded.path, { dataAtendimento: '2004-03-16' });
  const hidden = await apiJson<{ pacienteId: string }>('POST', '/pacientes', {
    nome: `${marker} sem vínculo sintético`, sexo: 'feminino',
  });
  restrictedId = hidden.pacienteId;
  await apiJson('PUT', `/pacientes/${restrictedId}/projetos`, { projetoId: project.id, participa: true });
  await seedAttendance(`/pacientes/${restrictedId}`, { dataAtendimento: '2004-03-15',
    pendencias: [{ descricao: `${marker} sem vínculo`, status: 'aberta' }] });
});

for (const perfil of ['administracao', 'edicao', 'consulta'] as const) {
  test(`ensaio final ${perfil}: início operacional, ficha, histórico, análise e CSV autorizados`, async ({ page }, info) => {
    test.setTimeout(100_000);
    await signIn(page, perfil);
    await expect(page.getByRole('heading', { name: 'Início', exact: true })).toBeVisible();
    await expect(page.getByText(`Boas-vindas, ${fixture.users[perfil].nome}.`, { exact: true })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Pacientes autorizados', exact: true })).toHaveCount(0);
    await expect(page.getByLabel('Data inicial', { exact: true })).toHaveCount(0);
    await expect(menu(page).getByRole('link', { name: 'Usuários', exact: true })).toHaveCount(perfil === 'administracao' ? 1 : 0);
    await expect(page.getByRole('link', { name: 'Cadastrar paciente', exact: true })).toHaveCount(perfil === 'consulta' ? 0 : 1);
    await capture(page, info, `inicio-${perfil}`);

    await page.getByLabel('Nome do paciente', { exact: true }).fill(marker);
    await page.getByRole('button', { name: 'Buscar paciente', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/pacientes\\?nome=${marker}`));
    await page.getByRole('link', { name: `Ver ficha de ${formulaName}`, exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Ficha do paciente', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Novo atendimento', exact: true })).toHaveCount(perfil === 'consulta' ? 0 : 1);
    await page.getByRole('navigation', { name: 'Seções da ficha', exact: true })
      .getByRole('link', { name: 'Atendimentos', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Histórico de atendimentos', exact: true })).toBeVisible();
    const history = page.getByRole('table', { name: 'Atendimentos desta página', exact: true });
    await expect(history).toContainText('13/03/2004');
    await expect(history).toContainText('14/03/2004');
    await capture(page, info, `historico-${perfil}`);
    await page.getByRole('navigation', { name: 'Caminho da página', exact: true }).getByRole('link', { name: 'Pacientes', exact: true }).click();
    expect(new URL(page.url()).searchParams.get('nome')).toBe(marker);

    await menu(page).getByRole('link', { name: 'Dashboard', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
    const data = await applyCombinedFilters(page);
    const expected = perfil === 'administracao' ? 3 : 2;
    expect(data.paginacao.total).toBe(expected);
    expect(data.indicadores.atendimentos.valor).toBe(expected);
    expect(data.serieAtendimentos.reduce((sum, month) => sum + month.total, 0)).toBe(expected);
    await expect(results(page).locator('tbody tr')).toHaveCount(expected);
    await expect(page.getByLabel(`Atendimentos realizados: ${expected}`, { exact: true })).toBeVisible();
    for (const [key, value] of Object.entries({ ...period, nome: marker, sexo: 'feminino', projetoId: project.id, statusPendencia: 'aberta', ordenacao: 'data_asc' })) {
      expect(new URL(page.url()).searchParams.get(key)).toBe(value);
    }
    const exported = await exportDashboard(page);
    expect(exported.text.trimEnd().split(/\r?\n/)).toHaveLength(expected + 1);
    expect(exported.text).toContain(`"'=1+1 ${marker}, ""Árvore sintética"""`);
    expect(exported.text.includes(`${marker} sem vínculo sintético`)).toBe(perfil === 'administracao');
    for (const [key, value] of Object.entries({ ...period, nome: marker, sexo: 'feminino', projetoId: project.id, statusPendencia: 'aberta', ordenacao: 'data_asc' })) {
      expect(exported.request.searchParams.get(key)).toBe(value);
    }
    await capture(page, info, `dashboard-${perfil}`);
    const before = page.url();
    await results(page).getByRole('link', { name: `Ver atendimento de ${formulaName}`, exact: true }).first().click();
    await expect(page.getByRole('heading', { name: 'Detalhe do atendimento', exact: true })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(before);
    await expect(results(page).locator('tbody tr')).toHaveCount(expected);
    // A direct forbidden clinical read is a real API refusal, without altering permissions.
    if (perfil !== 'administracao') expect((await apiAs(perfil, 'GET', `/pacientes/${restrictedId}`)).status).toBe(403);
    if (perfil === 'consulta') expect((await apiAs(perfil, 'POST', `${patient.path}/atendimentos`, { dataAtendimento: '2004-03-20' })).status).toBe(403);
    await menu(page).getByRole('link', { name: 'Importações', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Importações', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Simular planilha', exact: true })).toHaveCount(perfil === 'consulta' ? 0 : 1);
    await expect(page.getByRole('table', { name: 'Lotes disponíveis nesta página', exact: true })).toBeVisible();
    if (perfil === 'administracao') {
      await menu(page).getByRole('link', { name: 'Usuários', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Usuários', exact: true })).toBeVisible();
    } else {
      await menu(page).getByRole('link', { name: 'Minha conta', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Minha conta', exact: true })).toBeVisible();
    }
    info.annotations.push({ type: 'Ensaio sintético por perfil', description: JSON.stringify({ perfil, pacienteId: patient.pacienteId,
      restritoId: restrictedId, projetoId: project.id, filtros: Object.fromEntries(new URL(before).searchParams), linhasCSV: expected }) });
  });
}

test('ensaio final: paginação preserva filtros e CSV inclui os resultados além da página', async ({ page }) => {
  const query = new URLSearchParams({ ...period, nome: marker, pacienteId: patient.pacienteId, limit: '1', offset: '0', ordenacao: 'data_asc' });
  await signIn(page, 'consulta', `/dashboard?${query}`);
  await expect(results(page).locator('tbody tr')).toHaveCount(1);
  await expect(results(page)).toContainText('13/03/2004');
  const pagination = page.getByRole('navigation', { name: 'Paginação de resultados do dashboard', exact: true });
  await pagination.getByRole('button', { name: 'Próxima', exact: true }).click();
  await expect(results(page)).toContainText('14/03/2004');
  expect(new URL(page.url()).searchParams.get('offset')).toBe('1');
  expect(new URL(page.url()).searchParams.get('pacienteId')).toBe(patient.pacienteId);
  const exported = await exportDashboard(page);
  expect(exported.text.trimEnd().split(/\r?\n/)).toHaveLength(3);
  expect(exported.text.indexOf('2004-03-13')).toBeLessThan(exported.text.indexOf('2004-03-14'));
  await page.goBack();
  await expect(results(page)).toContainText('13/03/2004');
  await page.getByRole('button', { name: 'Remover filtro: ID do paciente', exact: true }).click();
  expect(new URL(page.url()).searchParams.has('pacienteId')).toBe(false);
  expect(new URL(page.url()).searchParams.get('nome')).toBe(marker);
  await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click();
  const cleared = new URL(page.url()).searchParams;
  for (const key of ['nome', 'pacienteId', 'sexo', 'projetoId', 'statusPendencia']) expect(cleared.has(key)).toBe(false);
});
