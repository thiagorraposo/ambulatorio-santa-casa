import { expect, test, type Locator, type Page } from '@playwright/test';
import type { SorologiaResponse } from '../../frontend/src/api/contracts';
import { apiAs, assertNoPersistentClinicalState, fixture } from './fixtures';
import { apiJson, assertAccessible, assertFitsViewport, loseResponseAfterCommit, readAttendance,
  seedAttendance, seedPatient, signIn, submitWrite } from './stage7-helpers';

test.describe.configure({ timeout: 180_000 });

const labels = {
  metodoSorologico: 'Método sorológico', dataSolicitacao: 'Data de solicitação', dataColeta: 'Data de coleta',
  dataResultado: 'Data do resultado', resultado: 'Resultado da sorologia', laboratorio: 'Laboratório',
  observacoes: 'Observações da sorologia',
} as const;

async function details(card: Locator, expected: Record<string, string>) {
  for (const [label, value] of Object.entries(expected)) {
    await expect(card.locator('dt').filter({ hasText: label }).locator('..').locator('dd')).toHaveText(value);
  }
}

async function review(page: Page) {
  await page.getByRole('button', { name: 'Revisar sorologia', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Revisão da sorologia', exact: true })).toBeFocused();
}

function observeWrites(page: Page, path: string) {
  const writes: Array<{ operation: string | undefined; body: Record<string, unknown> }> = [];
  page.on('request', request => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === `/v1${path}`) {
      writes.push({ operation: request.headers()['x-operacao-id'], body: request.postDataJSON() as Record<string, unknown> });
    }
  });
  return writes;
}

test('7B-E1U: revisa sete campos, preserva rascunho e confirma episódios de mesmo método sem inferência', async ({ page }, info) => {
  const patient = await seedPatient('Sorologias pela interface');
  const attendance = await seedAttendance(patient.path, { diagnosticoChagas: {
    possuiDiagnosticoChagas: null, resultadoFinal: 'inconclusivo', dataResultadoFinal: '2010-05-06',
    dataDescobertaAutorelato: '2001-02-03',
  } });
  const original = (await readAttendance(attendance.path)).diagnosticoChagas;
  const path = `${attendance.path}/sorologias`;
  const origin = `${attendance.path}?limit=10&offset=0`;
  const writes = observeWrites(page, path);
  await signIn(page, 'edicao', origin);
  await page.getByRole('link', { name: 'Sorologias deste atendimento', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sorologias do atendimento', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Voltar ao atendimento de origem' })).toHaveAttribute('href', origin);
  await page.getByRole('link', { name: 'Registrar sorologia', exact: true }).click();
  await page.setViewportSize({ width: 320, height: 844 });
  const method = 'Método repetido exclusivamente sintético';
  const first = { metodoSorologico: method, dataSolicitacao: '2026-04-11', dataColeta: '2026-04-02',
    dataResultado: '2026-03-28', resultado: null, laboratorio: 'Laboratório sintético A',
    observacoes: 'Primeiro episódio sintético\nObservação inicial' };
  for (const name of ['metodoSorologico', 'dataSolicitacao', 'dataColeta', 'dataResultado', 'laboratorio', 'observacoes'] as const) {
    await page.getByLabel(labels[name], { exact: true }).fill(first[name]);
  }
  await page.getByLabel(labels.resultado, { exact: true }).selectOption('');
  await assertFitsViewport(page);
  await assertAccessible(page);

  // Cancel the discard by keyboard without losing values or writing.
  const discard = page.getByRole('button', { name: 'Descartar rascunho', exact: true });
  await discard.click();
  await expect(page.getByRole('button', { name: 'Continuar editando', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(discard).toBeFocused();
  await expect(page.getByLabel(labels.observacoes, { exact: true })).toHaveValue(first.observacoes);
  await page.getByRole('link', { name: /Voltar aos episódios$/ }).click();
  await page.getByRole('dialog', { name: 'Alterações não salvas', exact: true })
    .getByRole('button', { name: 'Sair e manter rascunho', exact: true }).click();
  await expect(page.getByText('Nenhuma sorologia nesta página.', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Registrar sorologia', exact: true }).click();
  await expect(page.getByLabel(labels.metodoSorologico, { exact: true })).toHaveValue(method);
  await expect(page.getByLabel(labels.dataResultado, { exact: true })).toHaveValue(first.dataResultado);
  await review(page);
  const summary = page.getByRole('heading', { name: 'Revisão da sorologia', exact: true }).locator('..');
  await details(summary, { [labels.metodoSorologico]: method, [labels.dataSolicitacao]: '11/04/2026',
    [labels.dataColeta]: '02/04/2026', [labels.dataResultado]: '28/03/2026',
    [labels.resultado]: 'Desconhecido / não registrado', [labels.laboratorio]: first.laboratorio,
    [labels.observacoes]: first.observacoes });
  expect(writes).toHaveLength(0);
  await page.getByRole('button', { name: 'Voltar aos campos', exact: true }).click();
  first.observacoes = 'Primeiro episódio sintético\nCorrigido na revisão';
  await page.getByLabel(labels.observacoes, { exact: true }).fill(first.observacoes);
  await review(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await assertFitsViewport(page);
  await assertAccessible(page);
  const confirmed = page.waitForResponse(response => response.request().method() === 'POST'
    && new URL(response.url()).pathname === `/v1${path}`);
  await page.getByRole('button', { name: 'Confirmar sorologia', exact: true }).evaluate(node => {
    (node as HTMLButtonElement).click(); (node as HTMLButtonElement).click();
  });
  const response = await confirmed;
  expect(response.status()).toBe(201);
  const a = (await response.json() as { sorologiaId: string }).sorologiaId;
  await expect(page.getByRole('heading', { name: `Sorologia confirmada ${a}`, exact: true })).toBeVisible();
  expect(writes).toHaveLength(1);
  expect(writes[0]!.body).toEqual(first);

  await page.getByRole('button', { name: 'Registrar outro episódio', exact: true }).click();
  await page.getByLabel(labels.metodoSorologico, { exact: true }).fill(method);
  await page.getByLabel(labels.resultado, { exact: true }).selectOption('nao_informado');
  await review(page);
  expect(writes).toHaveLength(1);
  const second = await submitWrite(page, 'POST', path, 'Confirmar sorologia');
  const b = (await second.response.json() as { sorologiaId: string }).sorologiaId;
  expect(b).not.toBe(a);
  await expect(page.getByRole('heading', { name: `Sorologia confirmada ${b}`, exact: true })).toBeVisible();
  expect(writes).toHaveLength(2);
  expect(writes[1]!.body).toEqual({ metodoSorologico: method, dataSolicitacao: null, dataColeta: null,
    dataResultado: null, resultado: 'nao_informado', laboratorio: null, observacoes: null });
  expect(new Set(writes.map(write => write.operation)).size).toBe(2);
  expect(writes.every(write => /^[a-f0-9-]{36}$/.test(write.operation ?? ''))).toBe(true);

  // Discarding another draft cannot erase either confirmed receipt.
  await page.getByRole('button', { name: 'Registrar outro episódio', exact: true }).click();
  await page.getByLabel(labels.observacoes, { exact: true }).fill('Somente rascunho sintético descartado');
  await page.getByRole('button', { name: 'Descartar rascunho', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar descarte do rascunho', exact: true }).click();
  await expect(page.getByLabel(labels.observacoes, { exact: true })).toHaveValue('');
  await expect(page.getByRole('heading', { name: /^Sorologia confirmada / })).toHaveCount(2);
  expect(writes).toHaveLength(2);
  await page.getByRole('link', { name: 'Conferir episódios deste atendimento', exact: true }).click();
  const firstCard = page.getByRole('article', { name: `Sorologia ${a}`, exact: true });
  const secondCard = page.getByRole('article', { name: `Sorologia ${b}`, exact: true });
  await details(firstCard, { [labels.metodoSorologico]: method, [labels.dataSolicitacao]: '11/04/2026',
    [labels.dataColeta]: '02/04/2026', [labels.dataResultado]: '28/03/2026',
    [labels.resultado]: 'Desconhecido / não registrado', [labels.laboratorio]: first.laboratorio,
    [labels.observacoes]: first.observacoes });
  await details(secondCard, { [labels.metodoSorologico]: method, [labels.dataSolicitacao]: 'Desconhecido / não registrado',
    [labels.dataColeta]: 'Desconhecido / não registrado', [labels.dataResultado]: 'Desconhecido / não registrado',
    [labels.resultado]: 'Não informado (registrado)', [labels.laboratorio]: 'Desconhecido / não registrado',
    [labels.observacoes]: 'Desconhecido / não registrado' });
  const rows = await apiJson<SorologiaResponse[]>('GET', path);
  expect(rows).toHaveLength(2);
  expect(rows.find(row => row.sorologiaId === a)).toMatchObject({ ...first, atendimentoId: attendance.atendimentoId });
  expect((await readAttendance(attendance.path)).diagnosticoChagas).toEqual(original);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
  await assertFitsViewport(page);
  await assertAccessible(page);
  await page.getByRole('link', { name: 'Voltar ao atendimento de origem' }).click();
  expect(`${new URL(page.url()).pathname}${new URL(page.url()).search}`).toBe(origin);
  info.annotations.push({ type: 'IDs sintéticos', description: JSON.stringify({ pacienteId: patient.pacienteId,
    atendimentoId: attendance.atendimentoId, sorologias: [a, b] }) });
  await assertNoPersistentClinicalState(page);
});

test('7B-E1U: consulta pagina episódios, recupera erro de leitura e não oferece escrita', async ({ page }) => {
  const patient = await seedPatient('Sorologias paginação');
  const attendance = await seedAttendance(patient.path);
  const path = `${attendance.path}/sorologias`;
  const ids: string[] = [];
  for (let index = 0; index < 21; index++) ids.push((await apiJson<{ sorologiaId: string }>('POST', path,
    { metodoSorologico: `Método sintético página ${index + 1}` })).sorologiaId);
  const origin = `${attendance.path}?limit=10&offset=0`;
  const writes = observeWrites(page, path);
  await signIn(page, 'consulta', origin);
  await page.getByRole('link', { name: 'Sorologias deste atendimento', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(20);
  await expect(page.getByRole('heading', { name: `Sorologia ${ids[20]}`, exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: `Sorologia ${ids[0]}`, exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Registrar sorologia', exact: true })).toHaveCount(0);
  const pagination = page.getByRole('navigation', { name: 'Paginação de sorologias do atendimento', exact: true });
  let fail = true;
  await page.route(`**/v1${path}?**`, async route => {
    if (fail && new URL(route.request().url()).searchParams.get('offset') === '20') await route.abort('connectionreset');
    else await route.continue();
  });
  await pagination.getByRole('button', { name: 'Próxima', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(0);
  await expect(page.getByText('Nenhuma sorologia nesta página.', { exact: true })).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get('sorologiasOffset')).toBe('20');
  fail = false;
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: `Sorologia ${ids[0]}`, exact: true })).toBeVisible();
  await expect(pagination.getByRole('button', { name: 'Próxima', exact: true })).toBeDisabled();
  await page.setViewportSize({ width: 320, height: 844 });
  await assertFitsViewport(page);
  await assertAccessible(page);
  await page.goBack();
  await expect(page.getByRole('article')).toHaveCount(20);
  await page.goForward();
  await expect(page.getByRole('heading', { name: `Sorologia ${ids[0]}`, exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Voltar ao atendimento de origem' }).click();
  expect(`${new URL(page.url()).pathname}${new URL(page.url()).search}`).toBe(origin);
  await signIn(page, 'consulta', `${path}/nova`);
  await expect(page.getByRole('heading', { name: 'Acesso de consulta', exact: true })).toBeVisible();
  await expect(page.getByLabel(labels.metodoSorologico, { exact: true })).toHaveCount(0);
  expect((await apiAs('consulta', 'POST', path, { metodoSorologico: 'Recusa sintética' })).status).toBe(403);
  expect(await apiJson<SorologiaResponse[]>('GET', `${path}?limit=100`)).toHaveLength(21);
  expect(writes).toHaveLength(0);
});

test('7B-E1U: 403 de escrita mantém revisão e exige nova confirmação após restaurar a permissão', async ({ page }) => {
  const patient = await seedPatient('Sorologia escrita recusada');
  const attendance = await seedAttendance(patient.path);
  const path = `${attendance.path}/sorologias`;
  const accessPath = `${patient.path}/acesso/${fixture.users.edicao.usuarioId}`;
  const writes = observeWrites(page, path);
  await signIn(page, 'edicao', `${path}/nova`);
  const intended = 'Método sintético preservado após 403';
  await page.getByLabel(labels.metodoSorologico, { exact: true }).fill(intended);
  await page.getByLabel(labels.dataColeta, { exact: true }).fill('2026-03-02');
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
    await submitWrite(page, 'POST', path, 'Confirmar sorologia', 403);
    await expect(page.getByRole('alert')).toContainText(/autoriza|permissão|acesso/i);
    await expect(page.getByText(intended, { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirmar sorologia', exact: true })).toBeDisabled();
    await page.waitForLoadState('networkidle');
    expect(writes).toHaveLength(1);
    expect(await apiJson<SorologiaResponse[]>('GET', path)).toHaveLength(0);
    await apiJson('PUT', accessPath, { ativo: true, podeEditar: true });
    await page.getByRole('button', { name: 'Revalidar acesso e revisar rascunho', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Confirmar sorologia', exact: true })).toBeEnabled();
    expect(writes).toHaveLength(1);
    await page.getByRole('button', { name: 'Voltar aos campos', exact: true }).click();
    await expect(page.getByLabel(labels.metodoSorologico, { exact: true })).toHaveValue(intended);
    await review(page);
    const accepted = await submitWrite(page, 'POST', path, 'Confirmar sorologia');
    const id = (await accepted.response.json() as { sorologiaId: string }).sorologiaId;
    await expect(page.getByRole('heading', { name: `Sorologia confirmada ${id}`, exact: true })).toBeVisible();
    expect(writes).toHaveLength(2);
    expect(writes[1]!.body).toEqual(writes[0]!.body);
    expect(writes[1]!.operation).not.toBe(writes[0]!.operation);
    expect(await apiJson<SorologiaResponse[]>('GET', path)).toHaveLength(1);
  } finally { await apiJson('PUT', accessPath, { ativo: true, podeEditar: true }); }
});

test('7B-E1U: resposta perdida recupera o recibo por UUID e não duplica a sorologia', async ({ page }, info) => {
  const patient = await seedPatient('Sorologia resposta perdida');
  const attendance = await seedAttendance(patient.path);
  const path = `${attendance.path}/sorologias`;
  const writes = observeWrites(page, path);
  await signIn(page, 'edicao', `${path}/nova`);
  await page.getByLabel(labels.metodoSorologico, { exact: true }).fill('Método sintético de recuperação');
  await page.getByLabel(labels.resultado, { exact: true }).selectOption('indeterminado');
  await review(page);
  const lost = await loseResponseAfterCommit(page, 'POST', path);
  await page.getByRole('button', { name: 'Confirmar sorologia', exact: true }).click();
  const committed = await lost.committed;
  expect(committed.status()).toBe(201);
  const id = (await committed.json() as { sorologiaId: string }).sorologiaId;
  await expect(page.getByRole('alert')).toContainText(/não foi possível confirmar.*salva/i);
  await expect(page.getByRole('button', { name: 'Confirmar sorologia', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Voltar aos campos', exact: true })).toBeDisabled();
  await expect(page.getByRole('heading', { name: /^Sorologia confirmada / })).toHaveCount(0);
  await page.waitForLoadState('networkidle');
  expect(lost.writes()).toBe(1);
  expect(writes).toHaveLength(1);
  const operation = writes[0]!.operation!;
  expect(operation).toMatch(/^[a-f0-9-]{36}$/);
  expect(await apiJson('GET', `/operacoes/${operation}`, undefined, 'edicao')).toMatchObject({
    operacaoId: operation, estado: 'confirmada', resultado: { sorologiaId: id },
  });
  expect(await apiJson<SorologiaResponse[]>('GET', path)).toHaveLength(1);
  await page.getByRole('button', { name: 'Verificar resultado do envio', exact: true }).click();
  await expect(page.getByRole('heading', { name: `Sorologia confirmada ${id}`, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirmar sorologia', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Conferir episódios deste atendimento', exact: true }).click();
  await expect(page.getByRole('article', { name: `Sorologia ${id}`, exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: `Sorologia confirmada ${id}`, exact: true })).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(lost.writes()).toBe(1);
  expect(await apiJson<SorologiaResponse[]>('GET', path)).toHaveLength(1);
  info.annotations.push({ type: 'Recibo sintético', description: JSON.stringify({ pacienteId: patient.pacienteId,
    atendimentoId: attendance.atendimentoId, sorologiaId: id, operacaoId: operation }) });
  await assertNoPersistentClinicalState(page);
});
