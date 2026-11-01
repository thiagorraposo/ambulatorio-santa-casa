import { expect, test, type Page } from '@playwright/test';
import type { ComplicacaoResponse } from '../../frontend/src/api/contracts';
import { apiAs, assertNoPersistentClinicalState } from './fixtures';
import { apiJson, assertAccessible, assertFitsViewport, loseResponseAfterCommit, readAttendance,
  seedAttendance, seedPatient, signIn, submitWrite } from './stage7-helpers';

test.describe.configure({ timeout: 180_000 });
const unknown = 'Desconhecido / não registrado';
function observeWrites(page: Page, path: string) {
  const writes: Array<{ operation?: string; body: Record<string, unknown> }> = [];
  page.on('request', request => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === `/v1${path}`) {
      writes.push({ operation: request.headers()['x-operacao-id'], body: request.postDataJSON() as Record<string, unknown> });
    }
  });
  return writes;
}
async function review(page: Page) {
  await page.getByRole('button', { name: 'Revisar complicação', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Revisão da complicação', exact: true })).toBeFocused();
}

test('7B-E2U.2: revisa quatro campos, preserva rascunho e registra ocorrências repetidas sem inferência', async ({ page }, info) => {
  const patient = await seedPatient('Complicações pela interface');
  const attendance = await seedAttendance(patient.path);
  const other = await seedAttendance(patient.path);
  const path = `${attendance.path}/complicacoes-chagas`;
  const origin = `${attendance.path}?limit=10&offset=0`;
  const writes = observeWrites(page, path);
  await signIn(page, 'edicao', origin);
  await page.getByRole('link', { name: 'Complicações deste atendimento', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Voltar ao atendimento de origem' })).toHaveAttribute('href', origin);
  await page.getByRole('link', { name: 'Registrar complicação', exact: true }).click();
  await page.setViewportSize({ width: 320, height: 844 });
  await page.getByLabel('Tipo de complicação', { exact: true }).fill('Tipo livre repetido sintético');
  await page.getByLabel('Descrição da complicação', { exact: true }).fill('Relato independente sintético\nDescrição preservada');
  await page.getByLabel('Possui complicação', { exact: true }).selectOption('sim');
  await page.getByLabel('Possui complicação', { exact: true }).selectOption('nao');
  await page.getByLabel('Gravidade da complicação', { exact: true }).selectOption('nao_informado');
  await assertFitsViewport(page); await assertAccessible(page);
  const discard = page.getByRole('button', { name: 'Descartar rascunho', exact: true });
  await discard.click(); await expect(page.getByRole('button', { name: 'Continuar editando', exact: true })).toBeFocused();
  await page.keyboard.press('Escape'); await expect(discard).toBeFocused();
  await page.getByRole('link', { name: /Voltar aos episódios$/ }).click();
  await page.getByRole('dialog', { name: 'Alterações não salvas', exact: true })
    .getByRole('button', { name: 'Sair e manter rascunho', exact: true }).click();
  await page.getByRole('link', { name: 'Registrar complicação', exact: true }).click();
  await expect(page.getByLabel('Descrição da complicação', { exact: true })).toHaveValue('Relato independente sintético\nDescrição preservada');
  await review(page);
  const summary = page.getByRole('region', { name: 'Resumo da complicação', exact: true });
  await expect(summary.locator('dt')).toHaveCount(4);
  await expect(summary.getByText('Não', { exact: true })).toBeVisible();
  await expect(summary.getByText('Não informado (registrado)', { exact: true })).toBeVisible();
  expect(writes).toHaveLength(0);
  await page.getByRole('button', { name: 'Voltar aos campos', exact: true }).click();
  await page.getByLabel('Descrição da complicação', { exact: true }).fill('Relato corrigido sintético');
  await review(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await assertFitsViewport(page); await assertAccessible(page);
  const saved = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === `/v1${path}`);
  await page.getByRole('button', { name: 'Confirmar complicação', exact: true }).evaluate(node => {
    (node as HTMLButtonElement).click(); (node as HTMLButtonElement).click();
  });
  const response = await saved; expect(response.status()).toBe(201);
  const first = (await response.json() as { complicacaoChagasId: string }).complicacaoChagasId;
  await expect(page.getByRole('heading', { name: `Complicação confirmada ${first}`, exact: true })).toBeVisible();
  expect(writes).toHaveLength(1);
  expect(writes[0]!.body).toEqual({ tipoComplicacao: 'Tipo livre repetido sintético', possuiComplicacao: false,
    descricao: 'Relato corrigido sintético', gravidade: 'nao_informado' });
  await page.getByRole('button', { name: 'Registrar outro episódio', exact: true }).click();
  await page.getByLabel('Tipo de complicação', { exact: true }).fill('Tipo livre repetido sintético');
  await review(page);
  const secondResponse = await submitWrite(page, 'POST', path, 'Confirmar complicação');
  const second = (await secondResponse.response.json() as { complicacaoChagasId: string }).complicacaoChagasId;
  expect(second).not.toBe(first);
  await expect(page.getByRole('heading', { name: `Complicação confirmada ${first}`, exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: `Complicação confirmada ${second}`, exact: true })).toBeVisible();
  expect(writes).toHaveLength(2); expect(writes[1]!.operation).not.toBe(writes[0]!.operation);
  const records = await apiJson<ComplicacaoResponse[]>('GET', path);
  expect(records.map(row => row.complicacaoChagasId)).toEqual([second, first]);
  expect(records[0]).toMatchObject({ possuiComplicacao: null, descricao: null, gravidade: null });
  expect(await apiJson('GET', `${other.path}/complicacoes-chagas`)).toEqual([]);
  expect(await apiJson('GET', `${attendance.path}/condicao-chagas`)).toBeNull();
  expect((await readAttendance(attendance.path)).diagnosticoChagas).toBeNull();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
  await assertFitsViewport(page); await assertAccessible(page);
  await page.screenshot({ path: info.outputPath('complicacoes-recibos-zoom200.png'), fullPage: true });
  await assertNoPersistentClinicalState(page);
});

test('7B-E2U.2: pagina 20/1, consulta só lê e falha de leitura oculta registros anteriores', async ({ page }) => {
  const patient = await seedPatient('Complicações consulta');
  const attendance = await seedAttendance(patient.path);
  const path = `${attendance.path}/complicacoes-chagas`;
  for (let i = 0; i < 21; i++) await apiJson('POST', path, { tipoComplicacao: `Tipo sintético ${i}`, possuiComplicacao: false });
  const source = `${patient.path}?aba=chagas&atendimentoId=${attendance.atendimentoId}&consultaLimit=1&consultaOffset=0`;
  await signIn(page, 'consulta', source);
  await page.getByRole('link', { name: 'Complicações deste atendimento', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Complicações do atendimento', exact: true })).toBeVisible();
  await expect(page.locator('article.resource-item')).toHaveCount(20);
  await expect(page.getByRole('link', { name: 'Registrar complicação', exact: true })).toHaveCount(0);
  await page.getByRole('navigation', { name: 'Paginação de complicações do atendimento', exact: true })
    .getByRole('button', { name: 'Próxima', exact: true }).click();
  await expect(page.locator('article.resource-item')).toHaveCount(1);
  await expect(page.getByText('Tipo sintético 0', { exact: true })).toBeVisible();
  await page.route(`**/v1${path}?**`, route => route.abort('connectionreset'));
  await page.evaluate(() => { window.dispatchEvent(new Event('focus')); });
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByText('Tipo sintético 0', { exact: true })).toHaveCount(0);
  await page.unroute(`**/v1${path}?**`);
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByText('Tipo sintético 0', { exact: true })).toBeVisible();
  await signIn(page, 'consulta', `${path}/nova`);
  await expect(page.getByRole('heading', { name: 'Acesso de consulta', exact: true })).toBeVisible();
  expect((await apiAs('consulta', 'POST', path, { possuiComplicacao: true })).status).toBe(403);
});

test('7B-E2U.2: resposta perdida após COMMIT recupera recibo sem repetir ocorrência', async ({ page }, info) => {
  const patient = await seedPatient('Complicações recuperação');
  const attendance = await seedAttendance(patient.path);
  const path = `${attendance.path}/complicacoes-chagas`;
  const writes = observeWrites(page, path);
  await signIn(page, 'edicao', `${path}/nova`);
  await page.getByLabel('Descrição da complicação', { exact: true }).fill('Descrição sintética com presença desconhecida');
  await review(page);
  await expect(page.getByRole('region', { name: 'Resumo da complicação', exact: true }).getByText(unknown, { exact: true })).toHaveCount(3);
  const lost = await loseResponseAfterCommit(page, 'POST', path);
  await page.getByRole('button', { name: 'Confirmar complicação', exact: true }).click();
  const committed = await lost.committed; expect(committed.status()).toBe(201);
  const id = (await committed.json() as { complicacaoChagasId: string }).complicacaoChagasId;
  await expect(page.getByRole('alert')).toContainText(/não foi possível confirmar/i);
  await expect(page.getByRole('button', { name: 'Confirmar complicação', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Verificar resultado do envio', exact: true }).click();
  await expect(page.getByRole('heading', { name: `Complicação confirmada ${id}`, exact: true })).toBeVisible();
  expect(lost.writes()).toBe(1); expect(writes).toHaveLength(1);
  expect((await apiJson<ComplicacaoResponse[]>('GET', path)).map(row => row.complicacaoChagasId)).toEqual([id]);
  expect(await apiJson('GET', `/operacoes/${writes[0]!.operation}`, undefined, 'edicao')).toMatchObject({
    estado: 'confirmada', resultado: { complicacaoChagasId: id },
  });
  info.annotations.push({ type: 'Recibo sintético', description: JSON.stringify({ pacienteId: patient.pacienteId,
    atendimentoId: attendance.atendimentoId, complicacaoChagasId: id, operacaoId: writes[0]!.operation }) });
});
