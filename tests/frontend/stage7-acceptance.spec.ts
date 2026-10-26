import { test, expect } from '@playwright/test';
import { assertNoPersistentClinicalState } from './fixtures';
import { apiJson, assertAccessible, assertFitsViewport, readAttendance, readPatient, signIn, submitWrite } from './stage7-helpers';
import type { CounterReferralResponse, PendenciaResponse, ReferralResponse, RetornoBznResponse, TratamentoBznResponse } from '../../frontend/src/api/contracts';

test('7D: cadastro → atendimento composto → acompanhamentos → resolução → histórico pela interface', async ({ page }, info) => {
  test.setTimeout(180_000);
  const name = `Etapa 7 percurso integrado ${Date.now()} Sintético`;
  const requests: Array<{ method: string; path: string; operation: string | undefined }> = [];
  page.on('request', request => {
    const path = new URL(request.url()).pathname;
    if (request.method() !== 'GET' && path.startsWith('/v1/pacientes')) requests.push({
      method: request.method(), path, operation: request.headers()['x-operacao-id'],
    });
  });
  await signIn(page, 'administracao', '/pacientes/novo');
  await page.getByLabel('Nome para busca prévia', { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Consultar possíveis cadastros', exact: true }).click();
  await expect(page.getByText(/Nenhum paciente nesta página/)).toBeVisible();
  await page.getByLabel('Nome completo', { exact: true }).fill(name);
  await page.getByLabel('Data de nascimento', { exact: true }).fill('1980-03-04');
  await page.getByLabel('Endereço', { exact: true }).fill('Rua exclusivamente sintética 000');
  await page.getByLabel('Cidade', { exact: true }).fill('Cidade exclusivamente sintética');
  await page.getByRole('button', { name: 'Adicionar telefone', exact: true }).click();
  await page.getByLabel('Novo telefone', { exact: true }).fill('000000099');
  await assertAccessible(page);
  const registration = await submitWrite(page, 'POST', '/pacientes', 'Cadastrar paciente');
  const { pacienteId } = await registration.response.json() as { pacienteId: string };
  const patientPath = `/pacientes/${pacienteId}`;
  await expect(page.getByText('Paciente salvo.', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Novo atendimento', exact: true }).click();
  await page.getByLabel('Data do atendimento', { exact: true }).fill('2026-04-10');
  await page.getByLabel('Observações do atendimento', { exact: true }).fill('Consulta integrada exclusivamente sintética');
  await page.getByLabel('Peso (kg)', { exact: true }).fill('65.50');
  await page.getByLabel('Data de descoberta por autorrelato', { exact: true }).fill('2012-05-06');
  await page.getByRole('button', { name: 'Adicionar exame', exact: true }).click();
  const exam = page.getByLabel('Tipo de exame 1', { exact: true });
  await expect(exam.locator('option')).not.toHaveCount(1);
  await exam.selectOption({ index: 1 });
  await page.getByLabel('Identificação do exame 1', { exact: true }).fill('Exame solicitado sintético identificado');
  await page.getByLabel('Familiares examinados', { exact: true }).selectOption('sim');
  await page.getByRole('button', { name: 'Adicionar familiar examinado', exact: true }).click();
  await page.getByLabel('Identificação do familiar 1', { exact: true }).fill('Familiar integrado sintético');
  await page.getByLabel('Resultado do familiar 1', { exact: true }).fill('Resultado sintético');
  await page.getByRole('button', { name: 'Adicionar pendência', exact: true }).click();
  await page.getByLabel('Descrição da pendência 1', { exact: true }).fill('Pendência integrada de estado desconhecido');
  await page.getByLabel('Status da pendência 1', { exact: true }).selectOption('');
  await assertAccessible(page);
  const consultation = await submitWrite(page, 'POST', `${patientPath}/atendimentos`, 'Salvar atendimento');
  const { atendimentoId } = await consultation.response.json() as { atendimentoId: string };
  const attendancePath = `${patientPath}/atendimentos/${atendimentoId}`;
  expect(consultation.body).toMatchObject({ pendencias: [{ status: null }] });
  await expect(page.getByText(/Atendimento salvo.*confirmação própria/)).toBeVisible();
  await expect(page.getByText('Familiar integrado sintético', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Registrar acompanhamento', exact: true }).click();
  await expect(page.getByLabel('Atendimento de registro', { exact: true })).toHaveValue(atendimentoId);
  expect(new URL(page.url()).searchParams.get('atendimentoId')).toBe(atendimentoId);
  await page.getByLabel('Tratamento iniciado?', { exact: true }).selectOption('true');
  await page.getByLabel('Observações do tratamento', { exact: true }).fill('BZN integrado exclusivamente sintético');
  await page.getByRole('button', { name: 'Adicionar reação', exact: true }).click();
  await page.getByLabel('Descrição da reação 1', { exact: true }).fill('Reação integrada sintética');
  await page.getByLabel('Data da reação 1', { exact: true }).fill('2026-04-15');
  await submitWrite(page, 'POST', `${patientPath}/tratamento-bzn`, 'Salvar registro');
  await expect(page.getByText('Registro salvo.', { exact: true })).toBeVisible();
  await page.getByRole('navigation', { name: 'Operações clínicas' })
    .getByRole('link', { name: 'Registrar retorno BZN', exact: true }).click();
  await expect(page.getByLabel('Atendimento de registro', { exact: true })).toHaveValue(atendimentoId);
  await page.getByLabel('Tipo de retorno BZN', { exact: true }).selectOption('retorno_bzn_30_dias');
  await page.getByLabel('Data efetiva do comparecimento', { exact: true }).fill('2026-05-15');
  await page.getByLabel('Resumo do retorno', { exact: true }).fill('Retorno integrado realizado, sem data calculada');
  await submitWrite(page, 'POST', `${patientPath}/retornos-bzn`, 'Salvar registro');
  await expect(page.getByText('Registro salvo.', { exact: true })).toBeVisible();
  const operations = page.getByRole('navigation', { name: 'Operações clínicas' });
  await operations.getByRole('link', { name: 'Registrar encaminhamento', exact: true }).click();
  await expect(page.getByLabel('Atendimento de registro', { exact: true })).toHaveValue(atendimentoId);
  await page.getByLabel('Serviço de destino', { exact: true }).fill('Serviço integrado sintético');
  await page.getByLabel('Data do encaminhamento', { exact: true }).fill('2026-05-15');
  const referralWrite = await submitWrite(page, 'POST', `${patientPath}/encaminhamentos`, 'Salvar registro');
  const { encaminhamentoId } = await referralWrite.response.json() as { encaminhamentoId: string };
  await expect(page.getByText('Registro salvo.', { exact: true })).toBeVisible();
  await operations.getByRole('link', { name: 'Registrar contrarreferência', exact: true }).click();
  await page.getByLabel('Encaminhamento de origem', { exact: true }).selectOption(encaminhamentoId);
  await page.getByLabel('Resumo da contrarreferência', { exact: true }).fill('Contrarreferência integrada sintética');
  await page.getByLabel('Status da contrarreferência', { exact: true }).selectOption('concluido');
  await page.getByLabel('Data de realização da contrarreferência', { exact: true }).fill('2026-06-20');
  await submitWrite(page, 'POST', `${patientPath}/encaminhamentos/${encaminhamentoId}/contrarreferencias`, 'Salvar registro');
  await expect(page.getByText('Registro salvo.', { exact: true })).toBeVisible();
  await operations.getByRole('link', { name: 'Pendências do paciente', exact: true }).click();
  const pendingChoice = page.getByLabel('Pendência existente', { exact: true });
  const pendingOption = pendingChoice.locator('option').filter({ hasText: 'Pendência integrada de estado desconhecido' });
  await expect(pendingOption).toHaveCount(1);
  const pendenciaId = (await pendingOption.getAttribute('value'))!;
  await pendingChoice.selectOption(pendenciaId);
  await page.getByLabel('Status da pendência', { exact: true }).selectOption('resolvida');
  await page.getByLabel('Data de resolução da pendência', { exact: true }).fill('2026-06-20');
  await submitWrite(page, 'PATCH', `${patientPath}/pendencias/${pendenciaId}`, 'Salvar registro');
  await expect(page.getByText('Registro salvo.', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Voltar à origem', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${attendancePath}$`));
  await expect(page.getByText('Consulta integrada exclusivamente sintética', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Histórico do paciente', exact: true }).click();
  await expect(page.getByText('Consulta integrada exclusivamente sintética', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'BZN e retornos', exact: true }).click();
  await expect(page.getByText('BZN integrado exclusivamente sintético', { exact: true })).toBeVisible();
  await expect(page.getByText('Retorno integrado realizado, sem data calculada', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await assertFitsViewport(page);
  await assertAccessible(page);
  await page.screenshot({ path: info.outputPath('percurso-integrado-historico-mobile.png'), fullPage: true });
  const read = await readAttendance(attendancePath);
  expect(read).toMatchObject({ atendimentoId, diagnosticoChagas: { dataDescobertaAutorelato: '2012-05-06' },
    dadosClinicos: { pesoKg: '65.50' }, exames: [{ resultado: null }],
    pendencias: [{ descricao: 'Pendência integrada de estado desconhecido', status: 'resolvida', dataResolucao: '2026-06-20' }] });
  expect((await readPatient(patientPath)).telefones).toEqual(['000000099']);
  expect(await apiJson<TratamentoBznResponse>('GET', `${patientPath}/tratamento-bzn`)).toMatchObject({ atendimentoId,
    reacoes: [{ descricao: 'Reação integrada sintética', dataReacao: '2026-04-15' }] });
  expect(await apiJson<RetornoBznResponse[]>('GET', `${patientPath}/retornos-bzn`)).toEqual([
    expect.objectContaining({ atendimentoId, dataRealizada: '2026-05-15' }),
  ]);
  expect((await apiJson<PendenciaResponse[]>('GET', `${patientPath}/pendencias`))[0]).toMatchObject({ pendenciaId, status: 'resolvida' });
  expect(await apiJson<ReferralResponse[]>('GET', `${patientPath}/encaminhamentos`)).toEqual([
    expect.objectContaining({ encaminhamentoId, atendimentoId, destinoServico: 'Serviço integrado sintético' }),
  ]);
  expect(await apiJson<CounterReferralResponse[]>('GET', `${patientPath}/encaminhamentos/${encaminhamentoId}/contrarreferencias`)).toEqual([
    expect.objectContaining({ encaminhamentoId, atendimentoId, resumo: 'Contrarreferência integrada sintética', dataRealizada: '2026-06-20' }),
  ]);
  expect(requests.map(request => request.path)).toEqual(['/v1/pacientes', `/v1${patientPath}/atendimentos`,
    `/v1${patientPath}/tratamento-bzn`, `/v1${patientPath}/retornos-bzn`, `/v1${patientPath}/encaminhamentos`,
    `/v1${patientPath}/encaminhamentos/${encaminhamentoId}/contrarreferencias`, `/v1${patientPath}/pendencias/${pendenciaId}`]);
  expect(new Set(requests.map(request => request.operation)).size).toBe(7);
  expect(requests.every(request => /^[a-f0-9-]{36}$/.test(request.operation ?? ''))).toBe(true);
  info.annotations.push({ type: 'IDs sintéticos', description: JSON.stringify({ pacienteId, atendimentoId }) });
  await assertNoPersistentClinicalState(page);
});
