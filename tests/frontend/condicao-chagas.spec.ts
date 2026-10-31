import { expect, test, type Locator, type Page } from '@playwright/test';
import { apiAs, assertNoPersistentClinicalState, fixture } from './fixtures';
import { apiJson, assertAccessible, assertFitsViewport, loseResponseAfterCommit, readAttendance,
  seedAttendance, seedPatient, signIn, submitWrite } from './stage7-helpers';

test.describe.configure({ timeout: 180_000 });

interface Condition {
  condicaoChagasId: string;
  atendimentoId: string;
  formaClinica: string | null;
  faseDoenca: string | null;
  classificacaoClinica: string | null;
  possuiSintomas: boolean | null;
  descricaoSintomas: string | null;
  observacoes: string | null;
}
const labels = { formaClinica: 'Forma clínica', faseDoenca: 'Fase da doença',
  classificacaoClinica: 'Classificação clínica', possuiSintomas: 'Possui sintomas',
  descricaoSintomas: 'Descrição de sintomas', observacoes: 'Observações da condição' } as const;
const unknown = 'Desconhecido / não registrado';

async function details(scope: Locator, expected: Record<string, string>) {
  for (const [label, value] of Object.entries(expected)) {
    await expect(scope.locator('dt').filter({ hasText: new RegExp(`^${label}$`) }).locator('..').locator('dd')).toHaveText(value);
  }
}
async function review(page: Page) {
  await page.getByRole('button', { name: 'Revisar condição', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Revisão da condição de Chagas', exact: true })).toBeFocused();
}
function observeWrites(page: Page, path: string) {
  const writes: Array<{ operation?: string; body: Record<string, unknown> }> = [];
  page.on('request', request => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === `/v1${path}`) {
      writes.push({ operation: request.headers()['x-operacao-id'], body: request.postDataJSON() as Record<string, unknown> });
    }
  });
  return writes;
}

test('7B-E2U.1: revisa seis campos, preserva rascunho e confirma condição única sem inferir diagnóstico', async ({ page }, info) => {
  const patient = await seedPatient('Condição pela interface');
  const attendance = await seedAttendance(patient.path, { diagnosticoChagas: {
    possuiDiagnosticoChagas: null, resultadoFinal: 'inconclusivo', dataDescobertaAutorelato: '2001-02-03',
  } });
  const otherAttendance = await seedAttendance(patient.path);
  const original = (await readAttendance(attendance.path)).diagnosticoChagas;
  const path = `${attendance.path}/condicao-chagas`;
  const source = `${patient.path}?aba=chagas&atendimentoId=${attendance.atendimentoId}&consultaLimit=1&consultaOffset=1`;
  const origin = `${attendance.path}?limit=10&offset=0&retorno=${encodeURIComponent(source)}`;
  const writes = observeWrites(page, path);
  await signIn(page, 'edicao', origin);
  await page.getByRole('link', { name: 'Condição de Chagas deste atendimento', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Condição de Chagas do atendimento', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Voltar ao atendimento de origem' })).toHaveAttribute('href', origin);
  await page.getByRole('link', { name: 'Registrar condição de Chagas', exact: true }).click();
  await page.setViewportSize({ width: 320, height: 844 });
  await page.getByLabel(labels.formaClinica, { exact: true }).selectOption('cardiaca');
  await page.getByLabel(labels.faseDoenca, { exact: true }).selectOption('nao_informado');
  await page.getByLabel(labels.classificacaoClinica, { exact: true }).fill('Classificação livre sintética');
  await page.getByLabel(labels.possuiSintomas, { exact: true }).selectOption('sim');
  await page.getByLabel(labels.descricaoSintomas, { exact: true }).fill('Descrição sintética preservada\nMesmo após selecionar não');
  await page.getByLabel(labels.possuiSintomas, { exact: true }).selectOption('nao');
  await page.getByLabel(labels.observacoes, { exact: true }).fill('Observação sintética independente');
  await assertFitsViewport(page);
  await assertAccessible(page);
  const discard = page.getByRole('button', { name: 'Descartar rascunho', exact: true });
  await discard.click();
  await expect(page.getByRole('button', { name: 'Continuar editando', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(discard).toBeFocused();
  await page.getByRole('link', { name: /Voltar à condição$/ }).click();
  await page.getByRole('dialog', { name: 'Alterações não salvas', exact: true })
    .getByRole('button', { name: 'Sair e manter rascunho', exact: true }).click();
  await page.getByRole('link', { name: 'Registrar condição de Chagas', exact: true }).click();
  await expect(page.getByLabel(labels.possuiSintomas, { exact: true })).toHaveValue('nao');
  await expect(page.getByLabel(labels.descricaoSintomas, { exact: true })).toHaveValue('Descrição sintética preservada\nMesmo após selecionar não');
  await review(page);
  const summary = page.getByRole('region', { name: 'Resumo da condição', exact: true });
  await expect(summary.locator('dt')).toHaveCount(6);
  await details(summary, { [labels.formaClinica]: 'Cardíaca', [labels.faseDoenca]: 'Não informado (registrado)',
    [labels.classificacaoClinica]: 'Classificação livre sintética', [labels.possuiSintomas]: 'Não',
    [labels.descricaoSintomas]: 'Descrição sintética preservada\nMesmo após selecionar não',
    [labels.observacoes]: 'Observação sintética independente' });
  expect(writes).toHaveLength(0);
  await page.getByRole('button', { name: 'Voltar aos campos', exact: true }).click();
  await page.getByLabel(labels.observacoes, { exact: true }).fill('Observação corrigida na revisão');
  await review(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await assertFitsViewport(page);
  await assertAccessible(page);
  const response = page.waitForResponse(item => item.request().method() === 'POST'
    && new URL(item.url()).pathname === `/v1${path}`);
  await page.getByRole('button', { name: 'Confirmar condição', exact: true }).evaluate(node => {
    (node as HTMLButtonElement).click(); (node as HTMLButtonElement).click();
  });
  const confirmed = await response;
  expect(confirmed.status()).toBe(201);
  const id = (await confirmed.json() as { condicaoChagasId: string }).condicaoChagasId;
  await expect(page.getByRole('heading', { name: `Condição confirmada ${id}`, exact: true })).toBeVisible();
  expect(writes).toHaveLength(1);
  const intended = { formaClinica: 'cardiaca', faseDoenca: 'nao_informado', classificacaoClinica: 'Classificação livre sintética',
    possuiSintomas: false, descricaoSintomas: 'Descrição sintética preservada\nMesmo após selecionar não', observacoes: 'Observação corrigida na revisão' };
  expect(writes[0]!.body).toEqual(intended);
  expect(writes[0]!.operation).toMatch(/^[a-f0-9-]{36}$/);
  expect(await apiJson<Condition>('GET', path)).toEqual({ ...intended, condicaoChagasId: id, atendimentoId: attendance.atendimentoId });
  expect(await apiJson('GET', `${otherAttendance.path}/condicao-chagas`)).toBeNull();
  expect((await readAttendance(attendance.path)).diagnosticoChagas).toEqual(original);
  await page.getByRole('link', { name: 'Conferir condição deste atendimento', exact: true }).first().click();
  await expect(page.getByRole('link', { name: 'Registrar condição de Chagas', exact: true })).toHaveCount(0);
  await details(page.locator('main'), { [labels.possuiSintomas]: 'Não', [labels.faseDoenca]: 'Não informado (registrado)',
    [labels.observacoes]: intended.observacoes });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
  await assertFitsViewport(page);
  await assertAccessible(page);
  await page.getByRole('link', { name: 'Voltar ao atendimento de origem' }).click();
  expect(`${new URL(page.url()).pathname}${new URL(page.url()).search}`).toBe(origin);
  await page.evaluate(() => { document.documentElement.style.zoom = ''; });
  await page.getByRole('link', { name: 'Voltar à ficha de origem', exact: true }).click();
  expect(`${new URL(page.url()).pathname}${new URL(page.url()).search}`).toBe(source);
  await expect(page.getByLabel('Atendimento para consulta clínica', { exact: true })).toHaveValue(attendance.atendimentoId);
  await page.getByRole('link', { name: 'Condição de Chagas deste atendimento', exact: true }).click();
  await details(page.locator('main'), { [labels.observacoes]: intended.observacoes });
  await page.getByRole('link', { name: 'Voltar ao atendimento de origem' }).click();
  await page.getByRole('link', { name: 'Voltar à ficha de origem', exact: true }).click();
  expect(`${new URL(page.url()).pathname}${new URL(page.url()).search}`).toBe(source);
  await expect(page.getByLabel('Atendimento para consulta clínica', { exact: true })).toHaveValue(attendance.atendimentoId);
  expect(writes).toHaveLength(1);
  info.annotations.push({ type: 'IDs sintéticos', description: JSON.stringify({ pacienteId: patient.pacienteId,
    atendimentoId: attendance.atendimentoId, outroAtendimentoId: otherAttendance.atendimentoId, condicaoChagasId: id }) });
  await assertNoPersistentClinicalState(page);
});

test('7B-E2U.1: ausência e null permanecem distintos de negativo; consulta só lê e falha não mostra dado antigo', async ({ page }) => {
  const patient = await seedPatient('Condição desconhecida');
  const attendance = await seedAttendance(patient.path);
  const path = `${attendance.path}/condicao-chagas`;
  const writes = observeWrites(page, path);
  await signIn(page, 'edicao', `${path}/nova`);
  await page.getByLabel(labels.classificacaoClinica, { exact: true }).fill('Somente rascunho descartado');
  await page.getByRole('button', { name: 'Descartar rascunho', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar descarte do rascunho', exact: true }).click();
  await expect(page.getByLabel(labels.classificacaoClinica, { exact: true })).toHaveValue('');
  expect(await apiJson('GET', path)).toBeNull();
  await review(page);
  await details(page.getByRole('region', { name: 'Resumo da condição', exact: true }), Object.fromEntries(Object.values(labels).map(label => [label, unknown])));
  const saved = await submitWrite(page, 'POST', path, 'Confirmar condição');
  const id = (await saved.response.json() as { condicaoChagasId: string }).condicaoChagasId;
  await expect(page.getByRole('heading', { name: `Condição confirmada ${id}`, exact: true })).toBeVisible();
  expect(writes).toHaveLength(1);
  expect(writes[0]!.body).toEqual({ formaClinica: null, faseDoenca: null, classificacaoClinica: null,
    possuiSintomas: null, descricaoSintomas: null, observacoes: null });
  await signIn(page, 'consulta', path);
  await expect(page.getByRole('heading', { name: 'Condição de Chagas do atendimento', exact: true })).toBeVisible();
  await details(page.locator('main'), { [labels.possuiSintomas]: unknown });
  await expect(page.getByRole('link', { name: 'Registrar condição de Chagas', exact: true })).toHaveCount(0);
  let fail = true;
  await page.route(`**/v1${path}`, async route => {
    if (route.request().method() === 'GET' && fail) await route.abort('connectionreset');
    else await route.continue();
  });
  await page.evaluate(() => { window.dispatchEvent(new Event('focus')); });
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('main dt').filter({ hasText: /^Possui sintomas$/ })).toHaveCount(0);
  fail = false;
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await details(page.locator('main'), { [labels.possuiSintomas]: unknown });
  await signIn(page, 'consulta', `${path}/nova`);
  await expect(page.getByRole('heading', { name: 'Acesso de consulta', exact: true })).toBeVisible();
  await expect(page.getByLabel(labels.formaClinica, { exact: true })).toHaveCount(0);
  expect((await apiAs('consulta', 'POST', path, { possuiSintomas: true })).status).toBe(403);
  expect((await apiJson<Condition>('GET', path)).possuiSintomas).toBeNull();
  expect(writes).toHaveLength(1);
});

test('7B-E2U.1: resposta perdida recupera recibo por UUID sem repetir criação', async ({ page }, info) => {
  const patient = await seedPatient('Condição resposta perdida');
  const attendance = await seedAttendance(patient.path);
  const path = `${attendance.path}/condicao-chagas`;
  const writes = observeWrites(page, path);
  await signIn(page, 'edicao', `${path}/nova`);
  await page.getByLabel(labels.formaClinica, { exact: true }).selectOption('digestiva');
  await page.getByLabel(labels.descricaoSintomas, { exact: true }).fill('Descrição sintética com presença desconhecida');
  await review(page);
  const lost = await loseResponseAfterCommit(page, 'POST', path);
  await page.getByRole('button', { name: 'Confirmar condição', exact: true }).click();
  const committed = await lost.committed;
  expect(committed.status()).toBe(201);
  const id = (await committed.json() as { condicaoChagasId: string }).condicaoChagasId;
  await expect(page.getByRole('alert')).toContainText(/não foi possível confirmar.*salva/i);
  await expect(page.getByRole('button', { name: 'Confirmar condição', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Voltar aos campos', exact: true })).toBeDisabled();
  await page.waitForLoadState('networkidle');
  expect(lost.writes()).toBe(1);
  expect(writes).toHaveLength(1);
  const operation = writes[0]!.operation!;
  expect(await apiJson('GET', `/operacoes/${operation}`, undefined, 'edicao')).toMatchObject({
    operacaoId: operation, estado: 'confirmada', resultado: { condicaoChagasId: id },
  });
  await page.getByRole('button', { name: 'Verificar resultado do envio', exact: true }).click();
  await expect(page.getByRole('heading', { name: `Condição confirmada ${id}`, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirmar condição', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Conferir condição deste atendimento', exact: true }).first().click();
  await details(page.locator('main'), { [labels.descricaoSintomas]: 'Descrição sintética com presença desconhecida', [labels.possuiSintomas]: unknown });
  await page.goBack();
  await expect(page.getByRole('heading', { name: `Condição confirmada ${id}`, exact: true })).toBeVisible();
  expect(lost.writes()).toBe(1);
  expect((await apiJson<Condition>('GET', path)).condicaoChagasId).toBe(id);
  info.annotations.push({ type: 'Recibo sintético', description: JSON.stringify({ pacienteId: patient.pacienteId,
    atendimentoId: attendance.atendimentoId, condicaoChagasId: id, operacaoId: operation }) });
  await assertNoPersistentClinicalState(page);
});

test('7B-E2U.1: 403 conserva revisão, revalida acesso e exige nova confirmação explícita', async ({ page }) => {
  const patient = await seedPatient('Condição permissão');
  const attendance = await seedAttendance(patient.path);
  const path = `${attendance.path}/condicao-chagas`;
  const accessPath = `${patient.path}/acesso/${fixture.users.edicao.usuarioId}`;
  const writes = observeWrites(page, path);
  await signIn(page, 'edicao', `${path}/nova`);
  const intended = 'Descrição sintética preservada após 403';
  await page.getByLabel(labels.descricaoSintomas, { exact: true }).fill(intended);
  await review(page);
  let revoked = false;
  await page.route('**/v1/operacoes', async route => {
    if (revoked || route.request().method() !== 'POST') { await route.continue(); return; }
    expect(route.request().postDataJSON()).toMatchObject({ metodo: 'POST', caminho: `/v1${path}` });
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    await apiJson('PUT', accessPath, { ativo: true, podeEditar: false });
    revoked = true;
    await route.fulfill({ response });
  });
  try {
    await submitWrite(page, 'POST', path, 'Confirmar condição', 403);
    await expect(page.getByRole('alert')).toContainText(/autoriza|permissão|acesso/i);
    await expect(page.getByRole('region', { name: 'Resumo da condição', exact: true }).getByText(intended, { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirmar condição', exact: true })).toBeDisabled();
    expect(await apiJson('GET', path)).toBeNull();
    expect(writes).toHaveLength(1);
    await apiJson('PUT', accessPath, { ativo: true, podeEditar: true });
    await page.getByRole('button', { name: 'Revalidar acesso e revisar rascunho', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Confirmar condição', exact: true })).toBeEnabled();
    expect(writes).toHaveLength(1);
    const accepted = await submitWrite(page, 'POST', path, 'Confirmar condição');
    const id = (await accepted.response.json() as { condicaoChagasId: string }).condicaoChagasId;
    await expect(page.getByRole('heading', { name: `Condição confirmada ${id}`, exact: true })).toBeVisible();
    expect(writes).toHaveLength(2);
    expect(writes[1]!.body).toEqual(writes[0]!.body);
    expect(writes[1]!.operation).not.toBe(writes[0]!.operation);
  } finally { await apiJson('PUT', accessPath, { ativo: true, podeEditar: true }); }
});

test('7B-E2U.1: criação concorrente recebe 409 sem sobrescrever condição nem perder revisão', async ({ page }) => {
  const patient = await seedPatient('Condição concorrente');
  const attendance = await seedAttendance(patient.path);
  const path = `${attendance.path}/condicao-chagas`;
  const writes = observeWrites(page, path);
  await signIn(page, 'edicao', `${path}/nova`);
  await page.getByLabel(labels.classificacaoClinica, { exact: true }).fill('Rascunho concorrente preservado');
  await page.getByLabel(labels.possuiSintomas, { exact: true }).selectOption('nao');
  await review(page);
  const original = await apiJson<{ condicaoChagasId: string }>('POST', path,
    { formaClinica: 'indeterminada', possuiSintomas: null, observacoes: 'Condição original de outro autor sintético' });
  await submitWrite(page, 'POST', path, 'Confirmar condição', 409);
  await expect(page.getByRole('alert')).toContainText(/conflito|alterad|registr|condição/i);
  await expect(page.getByText('Rascunho concorrente preservado', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirmar condição', exact: true })).toBeDisabled();
  await expect(page.getByRole('heading', { name: /^Condição confirmada / })).toHaveCount(0);
  expect(writes).toHaveLength(1);
  expect(await apiJson<Condition>('GET', path)).toMatchObject({ ...original,
    possuiSintomas: null, classificacaoClinica: null, observacoes: 'Condição original de outro autor sintético' });
  await assertAccessible(page);
});
