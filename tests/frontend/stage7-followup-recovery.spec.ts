import { expect, test } from '@playwright/test';
import type { AnnualReturnResponse, PendenciaResponse, TratamentoBznResponse } from '../../frontend/src/api/contracts';
import { assertNoPersistentClinicalState, resumePage } from './fixtures';
import { apiJson, assertAccessible, seedAttendance, seedPatient, signIn, submitWrite } from './stage7-helpers';

test.describe.configure({ timeout: 120_000 });

test('7D-R1: atalhos mantêm atendimento e origem e a troca de consulta é explícita', async ({ page }) => {
  const patient = await seedPatient('Contexto entre acompanhamentos');
  const first = await seedAttendance(patient.path, { dataAtendimento: '2026-03-04' });
  const second = await seedAttendance(patient.path, { dataAtendimento: '2026-04-05' });
  await apiJson('POST', `${patient.path}/tratamento-bzn`, { atendimentoId: first.atendimentoId, observacoes: 'Canônico sintético' });
  const origin = `${first.path}?limit=10&offset=0`;
  await signIn(page, 'edicao', origin);
  await page.getByRole('link', { name: 'Registrar acompanhamento', exact: true }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('atendimentoId')).toBe(first.atendimentoId);
  await expect(page.getByRole('link', { name: 'Voltar à origem', exact: true })).toHaveAttribute('href', origin);
  await page.getByRole('link', { name: 'Registrar retorno BZN efetivo', exact: true }).click();
  await expect(page.getByLabel('Atendimento de registro', { exact: true })).toHaveValue(first.atendimentoId);
  await page.getByLabel('Atendimento de registro', { exact: true }).selectOption(second.atendimentoId);
  await expect(page.getByLabel('Atendimento de registro', { exact: true })).toHaveValue(second.atendimentoId);
  await page.getByRole('navigation', { name: 'Operações clínicas', exact: true })
    .getByRole('link', { name: 'Registrar retorno anual', exact: true }).click();
  await page.getByRole('button', { name: 'Sair e manter rascunho', exact: true }).click();
  await expect(page.getByLabel('Atendimento de registro', { exact: true })).toHaveValue(second.atendimentoId);
  await expect(page.getByRole('link', { name: 'Voltar à origem', exact: true })).toHaveAttribute('href', origin);
  await page.getByLabel('Data efetiva do comparecimento', { exact: true }).fill('2026-04-05');
  await page.getByLabel('Resumo do retorno anual', { exact: true }).fill('Consulta escolhida explicitamente');
  const saved = await submitWrite(page, 'POST', `${patient.path}/retornos-anuais`, 'Salvar registro');
  expect(saved.body.atendimentoId).toBe(second.atendimentoId);
  const records = await apiJson<AnnualReturnResponse[]>('GET', `${patient.path}/retornos-anuais`);
  expect(records).toHaveLength(1);
  expect(records[0]).toMatchObject({ atendimentoId: second.atendimentoId, dataRealizada: '2026-04-05' });
  await assertNoPersistentClinicalState(page);
});

test('7D-R1: contexto de outro paciente é recusado antes de apresentar formulário ou escrever', async ({ page }) => {
  const patient = await seedPatient('Contexto protegido');
  const other = await seedPatient('Outra pessoa no contexto');
  const attendance = await seedAttendance(other.path);
  let writes = 0;
  page.on('request', request => {
    if (request.method() !== 'GET' && new URL(request.url()).pathname.startsWith(`/v1${patient.path}/`)) writes++;
  });
  await signIn(page, 'edicao', `${patient.path}/registrar?tipo=encaminhamento&atendimentoId=${attendance.atendimentoId}`);
  await expect(page.getByRole('alert')).toContainText(/não encontrado|indisponível|não disponível/i);
  await expect(page.getByLabel('Serviço de destino', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Salvar registro', exact: true })).toHaveCount(0);
  expect(writes).toBe(0);
});

test('7D-R5: BZN concorrente mantém campos e reações do perdedor para cópia e descarte explícito', async ({ page }) => {
  const patient = await seedPatient('BZN concorrente e rascunho');
  const attendance = await seedAttendance(patient.path);
  await signIn(page, 'edicao', `${patient.path}/registrar?tipo=bzn&atendimentoId=${attendance.atendimentoId}`);
  await page.getByLabel('Tem indicação de BZN?', { exact: true }).selectOption('false');
  await page.getByLabel('Motivo de não indicação', { exact: true }).fill('Motivo sintético do rascunho perdedor');
  await page.getByLabel('Ano aproximado de uso', { exact: true }).fill('2014');
  await page.getByLabel('Observações do tratamento', { exact: true }).fill('Observação preservada do rascunho');
  await page.getByRole('button', { name: 'Adicionar reação', exact: true }).click();
  await page.getByLabel('Descrição da reação 1', { exact: true }).fill('Reação sintética conservada');
  await page.getByLabel('Gravidade da reação 1', { exact: true }).fill('Gravidade informada');
  await page.getByLabel('Data da reação 1', { exact: true }).fill('2014-02-28');
  await page.getByLabel('Consequência da reação 1', { exact: true }).fill('Consequência informada');
  await page.getByLabel('Observações da reação 1', { exact: true }).fill('Observação da reação');
  const winner = await apiJson<{ tratamentoId: string }>('POST', `${patient.path}/tratamento-bzn`, {
    atendimentoId: attendance.atendimentoId, temIndicacao: true, observacoes: 'Tratamento da outra intenção sintética',
  });
  let writes = 0;
  page.on('request', request => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === `/v1${patient.path}/tratamento-bzn`) writes++;
  });
  await submitWrite(page, 'POST', `${patient.path}/tratamento-bzn`, 'Salvar registro', 409);
  await expect(page.getByRole('table', { name: 'Tratamento registrado e valores do rascunho BZN', exact: true })).toBeVisible();
  await expect(page.getByText('Tratamento da outra intenção sintética', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Observações do tratamento', { exact: true })).toHaveValue('Observação preservada do rascunho');
  await expect(page.getByLabel('Descrição da reação 1', { exact: true })).toHaveValue('Reação sintética conservada');
  const copied = JSON.parse(await page.getByLabel('Rascunho BZN para copiar', { exact: true }).inputValue());
  expect(copied).toMatchObject({ atendimentoId: attendance.atendimentoId, temIndicacao: 'false', anoUsoAproximado: '2014',
    reacoes: [{ descricao: 'Reação sintética conservada', gravidade: 'Gravidade informada', dataReacao: '2014-02-28',
      consequencia: 'Consequência informada', observacoes: 'Observação da reação' }] });
  await expect(page.getByRole('button', { name: 'Salvar registro', exact: true })).toBeDisabled();
  await assertAccessible(page);
  await page.getByRole('button', { name: 'Descartar este rascunho BZN', exact: true }).click();
  await expect(page.getByLabel('Descrição da reação 1', { exact: true })).toHaveValue('Reação sintética conservada');
  await page.getByRole('button', { name: 'Confirmar descarte do rascunho BZN', exact: true }).click();
  await expect(page.getByLabel('Observações do tratamento', { exact: true })).toHaveCount(0);
  const canonical = await apiJson<TratamentoBznResponse>('GET', `${patient.path}/tratamento-bzn`);
  expect(canonical).toMatchObject({ tratamentoId: winner.tratamentoId, temIndicacao: true,
    observacoes: 'Tratamento da outra intenção sintética', reacoes: [] });
  expect(writes).toBe(1);
});

test('7D-R4: recibo e valores sobrevivem a auth/me temporário e a navegação sem novo POST', async ({ page }) => {
  const patient = await seedPatient('Recibo recuperável');
  const attendance = await seedAttendance(patient.path);
  await signIn(page, 'edicao', `${patient.path}/registrar?tipo=retorno-anual`);
  await page.getByLabel('Atendimento de registro', { exact: true }).selectOption(attendance.atendimentoId);
  await page.getByLabel('Data efetiva do comparecimento', { exact: true }).fill('2026-04-03');
  await page.getByLabel('Resumo do retorno anual', { exact: true }).fill('Retorno confirmado antes da indisponibilidade');
  let writes = 0;
  page.on('request', request => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === `/v1${patient.path}/retornos-anuais`) writes++;
  });
  const saved = await submitWrite(page, 'POST', `${patient.path}/retornos-anuais`, 'Salvar registro');
  const receipt = await saved.response.json() as { retornoId: string };
  await expect(page.getByText('Registro salvo.', { exact: true })).toBeVisible();
  await page.route('**/v1/auth/me', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
  const failed = page.waitForResponse(response => new URL(response.url()).pathname === '/v1/auth/me' && response.status() === 503);
  await resumePage(page);
  await failed;
  await expect(page.getByLabel('Resumo do retorno anual', { exact: true })).toHaveCount(0);
  await page.unroute('**/v1/auth/me');
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByText('Registro salvo.', { exact: true })).toBeVisible();
  await expect(page.getByText(receipt.retornoId, { exact: true })).toBeVisible();
  await expect(page.getByLabel('Resumo do retorno anual', { exact: true })).toHaveValue('Retorno confirmado antes da indisponibilidade');
  await expect(page.getByLabel('Data efetiva do comparecimento', { exact: true })).toHaveValue('2026-04-03');
  await expect(page.getByRole('button', { name: 'Salvar registro', exact: true })).toBeDisabled();
  await page.getByRole('navigation', { name: 'Operações clínicas', exact: true })
    .getByRole('link', { name: 'Notificação do paciente', exact: true }).click();
  await page.getByRole('navigation', { name: 'Operações clínicas', exact: true })
    .getByRole('link', { name: 'Registrar retorno anual', exact: true }).click();
  await expect(page.getByText(receipt.retornoId, { exact: true })).toBeVisible();
  await expect(page.getByLabel('Resumo do retorno anual', { exact: true })).toHaveValue('Retorno confirmado antes da indisponibilidade');
  expect(writes).toBe(1);
  const returns = await apiJson<AnnualReturnResponse[]>('GET', `${patient.path}/retornos-anuais`);
  expect(returns).toHaveLength(1);
  expect(returns[0].retornoId).toBe(receipt.retornoId);
  await assertNoPersistentClinicalState(page);
});

test('7B-R2: POST de pendências distingue desconhecido de não informado e aberta ao reler', async ({ page }) => {
  const patient = await seedPatient('Pendências desconhecidas');
  const attendance = await seedAttendance(patient.path);
  await signIn(page, 'edicao', `${patient.path}/registrar?tipo=pendencia&atendimentoId=${attendance.atendimentoId}`);
  for (const [index, status] of ['', 'nao_informado', 'aberta'].entries()) {
    if (index > 0) await page.getByRole('button', { name: 'Criar outra pendência', exact: true }).click();
    await page.getByLabel('Descrição da pendência', { exact: true }).fill(`Pendência sintética estado ${index}`);
    await page.getByLabel('Status da pendência', { exact: true }).selectOption(status);
    const saved = await submitWrite(page, 'POST', `${patient.path}/pendencias`, 'Salvar registro');
    expect(saved.body.status).toBe(status || null);
    await expect(page.getByText('Registro salvo.', { exact: true })).toBeVisible();
  }
  const pending = await apiJson<PendenciaResponse[]>('GET', `${patient.path}/pendencias?limit=100&offset=0`);
  expect(pending).toHaveLength(3);
  expect(pending.find(item => item.descricao === 'Pendência sintética estado 0')).toMatchObject({ status: null, dataResolucao: null });
  expect(pending.find(item => item.descricao === 'Pendência sintética estado 1')).toMatchObject({ status: 'nao_informado', dataResolucao: null });
  expect(pending.find(item => item.descricao === 'Pendência sintética estado 2')).toMatchObject({ status: 'aberta', dataResolucao: null });
});
