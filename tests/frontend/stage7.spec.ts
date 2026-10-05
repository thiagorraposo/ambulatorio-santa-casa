import { test, expect } from '@playwright/test';
import type { AnnualReturnResponse, ClinicalEventResponse, CounterReferralResponse, NotificationResponse,
  ProjectResponse, ReferralResponse, RetornoBznResponse, TratamentoBznResponse } from '../../frontend/src/api/contracts';
import { apiAs, fixture, resumePage, setUserActive, assertNoPersistentClinicalState, delayOneApiResponse } from './fixtures';
import { apiJson, assertAccessible, assertFitsViewport, loseResponseAfterCommit, readAttendance,
  readPatient, seedAttendance, seedPatient, signIn, submitWrite, visitByLink } from './stage7-helpers';

test.describe.configure({ timeout: 120_000 });

test('7A: cadastro exige nome, usa busca prévia e mantém homônimos separados', async ({ page }) => {
  const existing = await seedPatient('Homônimo');
  const original = await readPatient(existing.path);
  const capability = page.waitForResponse(response => response.request().method() === 'GET'
    && new URL(response.url()).pathname === '/v1/pacientes/capacidades');
  await signIn(page, 'administracao', '/pacientes/novo');
  expect(await (await capability).json()).toEqual({ podeCadastrar: true });
  await expect(page.getByRole('heading', { name: 'Cadastrar paciente', exact: true })).toBeVisible();
  await page.getByLabel('Nome para busca prévia', { exact: true }).fill(original.nome);
  const searched = page.waitForResponse(response => response.request().method() === 'GET'
    && new URL(response.url()).pathname === '/v1/pacientes' && new URL(response.url()).searchParams.get('nome') === original.nome);
  await page.getByRole('button', { name: 'Consultar possíveis cadastros', exact: true }).click();
  expect((await searched).status()).toBe(200);
  await expect(page.getByRole('link', { name: `${original.nome} · ID ${existing.pacienteId}`, exact: true })).toBeVisible();
  let writes = 0;
  page.on('request', request => { if (request.method() === 'POST' && new URL(request.url()).pathname === '/v1/pacientes') writes++; });
  await page.getByLabel('Nome completo', { exact: true }).fill('   ');
  await page.getByRole('button', { name: 'Cadastrar paciente', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(/nome.*obrigatório/i);
  expect(writes).toBe(0);
  await page.getByLabel('Nome completo', { exact: true }).fill(original.nome);
  await page.getByLabel('Endereço', { exact: true }).fill('Rua cadastro sintética 000');
  await page.getByLabel('Cidade', { exact: true }).fill('Cidade cadastro sintética');
  await page.getByRole('button', { name: 'Adicionar telefone', exact: true }).click();
  await page.getByLabel('Novo telefone', { exact: true }).fill('000000010');
  const written = await submitWrite(page, 'POST', '/pacientes', 'Cadastrar paciente');
  expect(written.body).not.toHaveProperty('idade');
  const created = await written.response.json() as { pacienteId: string };
  expect(typeof created.pacienteId).toBe('string');
  expect(created.pacienteId).not.toBe(existing.pacienteId);
  await expect(page).toHaveURL(new RegExp(`/pacientes/${created.pacienteId}$`));
  await expect(page.getByText('Paciente salvo.', { exact: true })).toBeVisible();
  const details = await readPatient(`/pacientes/${created.pacienteId}`);
  expect(details).toMatchObject({ nome: original.nome, dataNascimento: null, sexo: null, idade: null,
    endereco: { endereco: 'Rua cadastro sintética 000', cidade: 'Cidade cadastro sintética' }, telefones: ['000000010'] });
  const homonyms = await apiJson<Array<{ pacienteId: string; nome: string }>>('GET', `/pacientes?nome=${encodeURIComponent(original.nome)}&limit=100&offset=0`);
  expect(homonyms.map(row => row.pacienteId)).toEqual(expect.arrayContaining([existing.pacienteId, created.pacienteId]));
  expect((await readPatient(existing.path)).versao).toBe(original.versao);
  expect(writes).toBe(1);
});

test('7A: edição preserva contatos, endereço, estados desconhecidos e IDs textuais', async ({ page }) => {
  const patient = await seedPatient('Cadastro e contatos', {
    dataNascimento: '1980-02-10', raca: 'Valor legado sintético',
    pertenceComunidadeTradicional: null,
    endereco: { endereco: 'Rua sintética preservada 000', cidade: 'Cidade sintética original' },
    telefones: ['000000001', '000000002'],
  });
  const original = await readPatient(patient.path);
  expect(BigInt(patient.pacienteId)).toBeGreaterThan(BigInt(Number.MAX_SAFE_INTEGER));
  await signIn(page, 'edicao', `${patient.path}/editar`);
  await expect(page.getByRole('heading', { name: 'Editar paciente', exact: true })).toBeVisible();
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue(original.nome);
  await expect(page.getByLabel('Data de nascimento', { exact: true })).toHaveValue('1980-02-10');
  await expect(page.getByLabel('Raça', { exact: true })).toHaveValue('Valor legado sintético');
  await expect(page.getByLabel('Endereço', { exact: true })).toHaveValue('Rua sintética preservada 000');
  await expect(page.getByText('000000001', { exact: true })).toBeVisible();
  await expect(page.getByText('000000002', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Idade', { exact: true })).toHaveCount(0);
  await expect(page.getByText(/referência:/i)).toBeVisible();
  await page.getByLabel('Nome completo', { exact: true }).fill('Etapa 7 cadastro atualizado Sintético');
  await page.getByLabel('Cidade', { exact: true }).fill('Cidade sintética atualizada');
  await page.getByRole('button', { name: 'Adicionar telefone', exact: true }).click();
  await page.getByLabel('Novo telefone', { exact: true }).fill('000000003');
  const written = await submitWrite(page, 'PATCH', patient.path, 'Salvar paciente');
  expect(written.body.versao).toBe(original.versao);
  expect(typeof written.body.versao).toBe('string');
  await expect(page.getByText('Paciente salvo.', { exact: true })).toBeVisible();
  const updated = await readPatient(patient.path);
  expect(updated).toMatchObject({ pacienteId: patient.pacienteId, nome: 'Etapa 7 cadastro atualizado Sintético',
    dataNascimento: '1980-02-10', sexo: null, pertenceComunidadeTradicional: null,
    raca: 'Valor legado sintético', endereco: { endereco: 'Rua sintética preservada 000', cidade: 'Cidade sintética atualizada' },
    telefones: ['000000001', '000000002', '000000003'] });
  expect(BigInt(updated.versao)).toBeGreaterThan(BigInt(original.versao));
  await assertNoPersistentClinicalState(page);
});

test('7A/7D: 409 mantém o rascunho e a versão original do paciente sem sobrescrita', async ({ page }) => {
  const patient = await seedPatient('Concorrência paciente');
  const original = await readPatient(patient.path);
  await signIn(page, 'edicao', `${patient.path}/editar`);
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue(original.nome);
  await page.getByLabel('Nome completo', { exact: true }).fill('Etapa 7 rascunho local Sintético');
  await apiJson('PATCH', patient.path, { versao: original.versao, nome: 'Etapa 7 edição concorrente Sintético' });
  await resumePage(page);
  let writes = 0;
  page.on('request', request => { if (request.method() === 'PATCH' && new URL(request.url()).pathname === `/v1${patient.path}`) writes++; });
  const conflict = await submitWrite(page, 'PATCH', patient.path, 'Salvar paciente', 409);
  expect(conflict.body.versao).toBe(original.versao);
  await expect(page.getByRole('alert')).toContainText(/alterado por outra pessoa|desatualizad/i);
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue('Etapa 7 rascunho local Sintético');
  await page.waitForLoadState('networkidle');
  expect(writes).toBe(1);
  const concurrent = await readPatient(patient.path);
  expect(concurrent.nome).toBe('Etapa 7 edição concorrente Sintético');
  const comparisonRead = page.waitForResponse(response => response.request().method() === 'GET'
    && new URL(response.url()).pathname === `/v1${patient.path}`);
  await page.getByRole('button', { name: 'Comparar com registro atual', exact: true }).click();
  expect((await comparisonRead).status()).toBe(200);
  await expect(page.getByText(original.nome, { exact: true })).toBeVisible();
  await expect(page.getByText('Etapa 7 rascunho local Sintético', { exact: true })).toBeVisible();
  await expect(page.getByText('Etapa 7 edição concorrente Sintético', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Salvar paciente', exact: true })).toBeDisabled();
  expect(writes).toBe(1);
  await assertAccessible(page);
  await page.getByRole('button', { name: 'Descartar este rascunho e carregar versão atual', exact: true }).click();
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue(concurrent.nome);
  await expect(page.getByRole('button', { name: 'Salvar paciente', exact: true })).toBeDisabled();
  expect(writes).toBe(1);
  await page.getByLabel('Nome completo', { exact: true }).fill('Etapa 7 edição após comparação Sintético');
  const recovered = await submitWrite(page, 'PATCH', patient.path, 'Salvar paciente');
  expect(recovered.body.versao).toBe(concurrent.versao);
  await expect(page.getByText('Paciente salvo.', { exact: true })).toBeVisible();
  expect((await readPatient(patient.path)).nome).toBe('Etapa 7 edição após comparação Sintético');
  expect(writes).toBe(2);
  await assertNoPersistentClinicalState(page);
});

test('7A/7B: PATCH do núcleo usa a versão carregada e preserva filhos do atendimento', async ({ page }) => {
  const patient = await seedPatient('Núcleo versionado');
  const attendance = await seedAttendance(patient.path, {
    observacoes: 'Núcleo sintético original', dadosClinicos: { pesoKg: 70.25, nyha: 'II' },
    diagnosticoChagas: { possuiDiagnosticoChagas: null, dataDescobertaAutorelato: '2010-05-03' },
    pendencias: [{ descricao: 'Pendência sintética preservada', status: 'aberta' }],
    rastreioFamiliar: { familiaresExaminados: true, familiares: [{ familiar: 'Familiar sintético preservado', resultado: 'Inconclusivo sintético' }] },
  });
  const original = await readAttendance(attendance.path);
  await signIn(page, 'edicao', `${attendance.path}/editar`);
  await expect(page.getByRole('heading', { name: 'Editar atendimento', exact: true })).toBeVisible();
  await expect(page.getByLabel('Data do atendimento', { exact: true })).toHaveValue('2026-04-03');
  await expect(page.getByText(/esta edição altera os dados básicos/i)).toBeVisible();
  await page.getByLabel('Observações do atendimento', { exact: true }).fill('Núcleo sintético atualizado');
  const written = await submitWrite(page, 'PATCH', attendance.path, 'Salvar atendimento');
  expect(written.body.versao).toBe(original.versao);
  expect(written.body).not.toHaveProperty('dadosClinicos');
  expect(written.body).not.toHaveProperty('diagnosticoChagas');
  expect(written.body).not.toHaveProperty('pendencias');
  expect(written.body).not.toHaveProperty('rastreioFamiliar');
  const updated = await readAttendance(attendance.path);
  expect(updated.observacoes).toBe('Núcleo sintético atualizado');
  expect(updated.dadosClinicos).toEqual(original.dadosClinicos);
  expect(updated.diagnosticoChagas).toEqual(original.diagnosticoChagas);
  expect(updated.pendencias).toEqual(original.pendencias);
  expect(updated.rastreiosFamiliares).toEqual(original.rastreiosFamiliares);
  expect(BigInt(updated.versao)).toBeGreaterThan(BigInt(original.versao));
});

test('7A/7D: 409 do atendimento mantém a versão e as alterações locais', async ({ page }) => {
  const patient = await seedPatient('Concorrência atendimento');
  const attendance = await seedAttendance(patient.path, { observacoes: 'Versão sintética inicial' });
  const original = await readAttendance(attendance.path);
  await signIn(page, 'edicao', `${attendance.path}/editar`);
  await expect(page.getByLabel('Observações do atendimento', { exact: true })).toHaveValue('Versão sintética inicial');
  await page.getByLabel('Observações do atendimento', { exact: true }).fill('Rascunho atendimento sintético');
  await apiJson('PATCH', attendance.path, { versao: original.versao, observacoes: 'Atendimento concorrente sintético' });
  await resumePage(page);
  const conflict = await submitWrite(page, 'PATCH', attendance.path, 'Salvar atendimento', 409);
  expect(conflict.body.versao).toBe(original.versao);
  await expect(page.getByRole('alert')).toContainText(/alterado por outra pessoa|desatualizad/i);
  await expect(page.getByLabel('Observações do atendimento', { exact: true })).toHaveValue('Rascunho atendimento sintético');
  expect((await readAttendance(attendance.path)).observacoes).toBe('Atendimento concorrente sintético');
  expect((await apiJson<unknown[]>('GET', `${patient.path}/atendimentos`))).toHaveLength(1);
});

test('7D: consulta não escreve, vínculo delimita edição e administração segue a API', async ({ page }) => {
  await signIn(page, 'consulta', `/pacientes/${fixture.main.pacienteId}/atendimentos/novo`);
  await expect(page.getByText('Acesso de consulta', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Salvar atendimento', exact: true })).toHaveCount(0);
  expect((await apiAs('consulta', 'POST', `/pacientes/${fixture.main.pacienteId}/atendimentos`, { dataAtendimento: '2026-04-04' })).status).toBe(403);
  expect((await apiAs('consulta', 'POST', '/pacientes', { nome: 'Etapa 7 escrita recusada Sintético' })).status).toBe(403);
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await signIn(page, 'edicao', `/pacientes/${fixture.reserved.pacienteId}/editar`);
  await expect(page.getByRole('alert')).toContainText(/acesso|permissão|autoriza/i);
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveCount(0);
  await expect(page.getByText(fixture.reserved.nome, { exact: true })).toHaveCount(0);
  const reserved = await readPatient(`/pacientes/${fixture.reserved.pacienteId}`);
  expect((await apiAs('edicao', 'PATCH', `/pacientes/${fixture.reserved.pacienteId}`, {
    versao: reserved.versao, nome: 'Etapa 7 mudança recusada Sintético',
  })).status).toBe(403);
  expect((await apiAs('edicao', 'POST', '/pacientes', { nome: 'Etapa 7 cadastro sem política Sintético' })).status).toBe(403);
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await signIn(page, 'administracao', `/pacientes/${fixture.reserved.pacienteId}/editar`);
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue(fixture.reserved.nome);
  await page.getByLabel('Raça', { exact: true }).fill('Raça administrativa sintética');
  await submitWrite(page, 'PATCH', `/pacientes/${fixture.reserved.pacienteId}`, 'Salvar paciente');
  expect((await readPatient(`/pacientes/${fixture.reserved.pacienteId}`)).raca).toBe('Raça administrativa sintética');
});

test('7D: revogação da permissão de escrita retorna 403 e conserva rascunho sem sucesso', async ({ page }) => {
  const patient = await seedPatient('Vínculo revogado');
  const original = await readPatient(patient.path);
  await signIn(page, 'edicao', `${patient.path}/editar`);
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue(original.nome);
  await page.getByLabel('Nome completo', { exact: true }).fill('Etapa 7 rascunho sem autorização Sintético');
  await apiJson('PUT', `${patient.path}/acesso/${fixture.users.edicao.usuarioId}`, { ativo: true, podeEditar: false });
  await submitWrite(page, 'PATCH', patient.path, 'Salvar paciente', 403);
  await expect(page.getByRole('alert')).toContainText(/acesso|permissão|autoriza/i);
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue('Etapa 7 rascunho sem autorização Sintético');
  await expect(page.getByText('Paciente salvo.', { exact: true })).toHaveCount(0);
  expect((await readPatient(patient.path)).nome).toBe(original.nome);
});

test('7D: draft protege navegação, voltar, teclado, mobile e zoom; saída apaga o draft', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const patient = await seedPatient('Rascunho acessível');
  const original = await readPatient(patient.path);
  await signIn(page, 'edicao', `${patient.path}/editar`);
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue(original.nome);
  await assertAccessible(page);
  await page.getByLabel('Nome completo', { exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Data de nascimento', { exact: true })).toBeFocused();
  await page.getByLabel('Nome completo', { exact: true }).fill('Etapa 7 rascunho de navegação Sintético');
  await page.getByRole('navigation', { name: 'Menu principal' }).getByRole('link', { name: 'Início', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Alterações não salvas', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Continuar editando', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Sair e manter rascunho', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Continuar editando', exact: true })).toBeFocused();
  await assertAccessible(page);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue('Etapa 7 rascunho de navegação Sintético');
  await page.getByRole('navigation', { name: 'Menu principal' }).getByRole('link', { name: 'Início', exact: true }).click();
  await dialog.getByRole('button', { name: 'Sair e manter rascunho', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Início', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue('Etapa 7 rascunho de navegação Sintético');
  let unloadProtected = false;
  page.once('dialog', async browserDialog => { unloadProtected = browserDialog.type() === 'beforeunload'; await browserDialog.dismiss(); });
  await page.reload({ timeout: 3_000 }).catch(error => {
    expect(String(error)).toMatch(/net::ERR_ABORTED|navigation.*cancel|timeout.*exceeded/i);
  });
  expect(unloadProtected).toBe(true);
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue('Etapa 7 rascunho de navegação Sintético');
  await page.screenshot({ path: testInfo.outputPath('paciente-edicao-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await assertAccessible(page);
  await assertFitsViewport(page);
  await page.screenshot({ path: testInfo.outputPath('paciente-edicao-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
  await assertFitsViewport(page);
  await assertAccessible(page);
  await page.screenshot({ path: testInfo.outputPath('paciente-edicao-zoom200.png'), fullPage: true });
  await page.evaluate(() => { document.documentElement.style.zoom = ''; });
  await assertNoPersistentClinicalState(page);
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.getByLabel('Usuário', { exact: true })).toBeVisible();
  await signIn(page, 'edicao', `${patient.path}/editar`);
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue(original.nome);
});

test('7D: expiração limpa alterações clínicas em memória antes da nova sessão', async ({ page }) => {
  const patient = await seedPatient('Rascunho expirado');
  const original = await readPatient(patient.path);
  await page.clock.install({ time: new Date() });
  const authentication = await signIn(page, 'edicao', `${patient.path}/editar`);
  expect(authentication.expiresIn).toBe(60);
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue(original.nome);
  await page.getByLabel('Nome completo', { exact: true }).fill('Etapa 7 rascunho expirado descartado Sintético');
  await page.clock.fastForward(61_000);
  await expect(page.getByLabel('Usuário', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveCount(0);
  await assertNoPersistentClinicalState(page);
  await signIn(page, 'edicao', `${patient.path}/editar`);
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue(original.nome);
});

test('7B: atendimento composto valida ambiguidades, faz rollback e salva todos os campos preenchidos', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const patient = await seedPatient('Composto clínico');
  const catalog = await apiJson<Array<{ id: string; codigo: string; nome: string; ativo: boolean }>>('GET', '/catalogos/exames?limit=100&offset=0');
  const holter = catalog.find(exam => exam.codigo === 'holter')!;
  const generic = catalog.find(exam => exam.codigo === 'outro')!;
  expect(holter).toBeDefined();
  expect(generic).toBeDefined();
  expect(catalog.every(exam => exam.ativo && typeof exam.id === 'string')).toBe(true);
  await signIn(page, 'edicao', `${patient.path}/atendimentos/novo`);
  await expect(page.getByRole('heading', { name: 'Novo atendimento', exact: true })).toBeVisible();
  await page.getByLabel('Data do atendimento', { exact: true }).fill('2026-04-04');
  await page.getByLabel('Localização do prontuário', { exact: true }).fill('Arquivo composto sintético');
  await page.getByLabel('Somente ambulatório', { exact: true }).selectOption('nao');
  await page.getByLabel('Observações do atendimento', { exact: true }).fill('Atendimento composto sintético');
  for (const [label, value] of [['Altura (cm)', '170'], ['Peso (kg)', '70.25'],
    ['Circunferência abdominal (cm)', '90.5'], ['Frequência cardíaca (bpm)', '70'],
    ['Saturação (%)', '97.5'], ['PA sistólica (mmHg)', '120'], ['PA diastólica (mmHg)', '80']] as const) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
  await page.getByLabel('NYHA', { exact: true }).fill('II');
  await page.getByLabel('Observações clínicas', { exact: true }).fill('Avaliação completa sintética');
  await page.getByLabel('Status do diagnóstico', { exact: true }).selectOption('inconclusivo');
  await page.getByLabel('Resultado final', { exact: true }).selectOption('indeterminado');
  await page.getByLabel('Data do resultado final', { exact: true }).fill('2025-12-01');
  await page.getByLabel('Data de descoberta por autorrelato', { exact: true }).fill('2010-05-03');
  await page.getByLabel('Critério de confirmação', { exact: true }).fill('Critério sintético');
  await page.getByLabel('Observações do diagnóstico', { exact: true }).fill('Diagnóstico sintético independente da descoberta');
  const loadedCatalog = page.waitForResponse(response => response.request().method() === 'GET'
    && new URL(response.url()).pathname === '/v1/catalogos/exames');
  await page.getByRole('button', { name: 'Adicionar exame', exact: true }).click();
  expect((await loadedCatalog).status()).toBe(200);
  await page.getByLabel('Tipo de exame 1', { exact: true }).selectOption(holter.id);
  await page.getByLabel('Origem do exame 1', { exact: true }).selectOption('solicitado');
  await page.getByLabel('Observações do exame 1', { exact: true }).fill('Solicitação sintética sem resultado');
  await page.getByRole('button', { name: 'Adicionar exame', exact: true }).click();
  await page.getByLabel('Tipo de exame 2', { exact: true }).selectOption(generic.id);
  await page.getByLabel('Origem do exame 2', { exact: true }).selectOption('trazido');
  await expect(page.getByLabel('Identificação do exame 2', { exact: true })).toHaveAttribute('required', '');
  await page.getByLabel('Identificação do exame 2', { exact: true }).fill('Exame genérico sintético identificado');
  await page.getByLabel('Resultado do exame 2', { exact: true }).fill('Resultado textual sintético');
  await page.getByLabel('Observações do exame 2', { exact: true }).fill('Observação do exame sintética');
  await page.getByLabel('Familiares examinados', { exact: true }).selectOption('nao');
  await page.getByRole('button', { name: 'Adicionar familiar examinado', exact: true }).click();
  await page.getByLabel('Identificação do familiar 1', { exact: true }).fill('Familiar identificado sintético');
  await page.getByLabel('Resultado do familiar 1', { exact: true }).fill('Resultado familiar inconclusivo sintético');
  for (const [index, status] of [[1, 'em_andamento'], [2, 'nao_informado'], [3, 'resolvida']] as const) {
    await page.getByRole('button', { name: 'Adicionar pendência', exact: true }).click();
    await page.getByLabel(`Descrição da pendência ${index}`, { exact: true }).fill(`Pendência composta sintética ${index}`);
    await page.getByLabel(`Status da pendência ${index}`, { exact: true }).selectOption(status);
    if (status === 'resolvida') {
      await expect(page.getByLabel(`Data de resolução da pendência ${index}`, { exact: true })).toHaveAttribute('required', '');
      await page.getByLabel(`Data de resolução da pendência ${index}`, { exact: true }).fill('2026-04-04');
    }
  }
  let writes = 0;
  page.on('request', request => { if (request.method() === 'POST' && new URL(request.url()).pathname === `/v1${patient.path}/atendimentos`) writes++; });
  await page.getByRole('button', { name: 'Salvar atendimento', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(/familiares preenchidos.*exigem|nenhum resultado será descartado/i);
  expect(writes).toBe(0);
  await expect(page.getByLabel('Resultado do familiar 1', { exact: true })).toHaveValue('Resultado familiar inconclusivo sintético');
  await page.getByLabel('Familiares examinados', { exact: true }).selectOption('sim');
  await assertAccessible(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await assertFitsViewport(page);
  await assertAccessible(page);
  await page.screenshot({ path: testInfo.outputPath('atendimento-composto-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByLabel('Peso (kg)', { exact: true }).fill('9999999');
  await submitWrite(page, 'POST', `${patient.path}/atendimentos`, 'Salvar atendimento', 400);
  await expect(page.getByRole('alert')).toContainText(/incompatíveis|revise/i);
  expect(await apiJson<unknown[]>('GET', `${patient.path}/atendimentos`)).toHaveLength(0);
  expect(await apiJson<unknown[]>('GET', `${patient.path}/exames`)).toHaveLength(0);
  await expect(page.getByLabel('Observações clínicas', { exact: true })).toHaveValue('Avaliação completa sintética');
  await page.getByLabel('Peso (kg)', { exact: true }).fill('70.25');
  const written = await submitWrite(page, 'POST', `${patient.path}/atendimentos`, 'Salvar atendimento');
  const created = await written.response.json() as { atendimentoId: string };
  expect(typeof created.atendimentoId).toBe('string');
  await expect(page).toHaveURL(new RegExp(`/atendimentos/${created.atendimentoId}$`));
  await expect(page.getByText(/Atendimento salvo.*confirmação própria/)).toBeVisible();
  const details = await readAttendance(`${patient.path}/atendimentos/${created.atendimentoId}`);
  expect(details).toMatchObject({ dataAtendimento: '2026-04-04', localizacaoProntuario: 'Arquivo composto sintético',
    ambulatorioUnicamente: false, ambulatorioAnexoProjeto: null, observacoes: 'Atendimento composto sintético',
    dadosClinicos: { alturaCm: '170.00', pesoKg: '70.25', circunferenciaAbdominalCm: '90.50', frequenciaCardiacaBpm: 70,
      saturacaoPercentual: '97.50', paSistolicaMmhg: 120, paDiastolicaMmhg: 80, nyha: 'II', observacoes: 'Avaliação completa sintética' },
    diagnosticoChagas: { possuiDiagnosticoChagas: null, statusDiagnostico: 'inconclusivo', resultadoFinal: 'indeterminado',
      dataResultadoFinal: '2025-12-01', dataDescobertaAutorelato: '2010-05-03', criterioConfirmacao: 'Critério sintético',
      observacoes: 'Diagnóstico sintético independente da descoberta' } });
  expect(details.exames).toHaveLength(2);
  expect(details.exames).toEqual(expect.arrayContaining([
    expect.objectContaining({ codigoExame: 'holter', bloco: 'solicitado', resultado: null, observacoes: 'Solicitação sintética sem resultado' }),
    expect.objectContaining({ codigoExame: 'outro', bloco: 'trazido', identificacao: 'Exame genérico sintético identificado',
      resultado: 'Resultado textual sintético', observacoes: 'Observação do exame sintética' }),
  ]));
  expect(details.rastreioFamiliar).toMatchObject({ familiaresExaminados: true, familiares: [
    { identificacaoFamiliar: 'Familiar identificado sintético', resultadoSorologia: 'Resultado familiar inconclusivo sintético' },
  ] });
  expect(details.pendencias).toEqual(expect.arrayContaining([
    expect.objectContaining({ descricao: 'Pendência composta sintética 1', status: 'em_andamento', dataIdentificacao: '2026-04-04' }),
    expect.objectContaining({ descricao: 'Pendência composta sintética 2', status: 'nao_informado', dataIdentificacao: '2026-04-04' }),
    expect.objectContaining({ descricao: 'Pendência composta sintética 3', status: 'resolvida', dataIdentificacao: '2026-04-04', dataResolucao: '2026-04-04' }),
  ]));
  expect(await apiJson<unknown[]>('GET', `${patient.path}/atendimentos`)).toHaveLength(1);
  expect(writes).toBe(2);
});

test('7C: BZN único com reação, retornos repetidos e ano informado separado de visitas', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const patient = await seedPatient('BZN e anual');
  const attendance = await seedAttendance(patient.path);
  await signIn(page, 'edicao', `${patient.path}/registrar?tipo=bzn`);
  await expect(page.getByLabel('Atendimento de registro', { exact: true })).toBeVisible();
  await page.getByLabel('Atendimento de registro', { exact: true }).selectOption(attendance.atendimentoId);
  await page.getByLabel('Tratamento iniciado?', { exact: true }).selectOption('true');
  await page.getByLabel('Tratamento pelo ambulatório?', { exact: true }).selectOption('false');
  await page.getByLabel('Duração efetivamente cumprida (dias)', { exact: true }).fill('45');
  await page.getByLabel('Ano aproximado de uso', { exact: true }).fill('2024');
  await page.getByLabel('Data da prescrição', { exact: true }).fill('2026-04-04');
  await page.getByLabel('Teve reação adversa?', { exact: true }).selectOption('true');
  await page.getByLabel('Observações do tratamento', { exact: true }).fill('Tratamento BZN sintético registrado');
  await page.getByRole('button', { name: 'Adicionar reação', exact: true }).click();
  await page.getByLabel('Descrição da reação 1', { exact: true }).fill('Reação BZN sintética identificada');
  await page.getByLabel('Gravidade da reação 1', { exact: true }).fill('Gravidade sintética');
  await page.getByLabel('Data da reação 1', { exact: true }).fill('2026-04-06');
  await page.getByLabel('Consequência da reação 1', { exact: true }).fill('Consequência sintética');
  await page.getByLabel('Observações da reação 1', { exact: true }).fill('Observação da reação sintética');
  await assertAccessible(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await assertFitsViewport(page);
  await assertAccessible(page);
  await page.screenshot({ path: testInfo.outputPath('tratamento-bzn-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
  await assertFitsViewport(page);
  await assertAccessible(page);
  await page.screenshot({ path: testInfo.outputPath('tratamento-bzn-zoom200.png'), fullPage: true });
  await page.evaluate(() => { document.documentElement.style.zoom = ''; });
  const written = await submitWrite(page, 'POST', `${patient.path}/tratamento-bzn`, 'Salvar registro');
  expect(written.body.temIndicacao).toBeNull();
  const treatment = await apiJson<TratamentoBznResponse>('GET', `${patient.path}/tratamento-bzn`);
  expect(treatment).toMatchObject({ atendimentoId: attendance.atendimentoId, temIndicacao: null,
    iniciado: true, tratamentoPeloAmbulatorio: false, duracaoCumpridaDias: 45, anoUsoAproximado: 2024,
    dataPrescricao: '2026-04-04', teveReacaoAdversa: true, observacoes: 'Tratamento BZN sintético registrado',
    reacoes: [{ descricao: 'Reação BZN sintética identificada', gravidade: 'Gravidade sintética',
      dataReacao: '2026-04-06', consequencia: 'Consequência sintética', observacoes: 'Observação da reação sintética' }] });
  expect((await apiAs('edicao', 'POST', `${patient.path}/tratamento-bzn`, { iniciado: true })).status).toBe(409);
  expect((await apiJson<TratamentoBznResponse>('GET', `${patient.path}/tratamento-bzn`)).tratamentoId).toBe(treatment.tratamentoId);
  await visitByLink(page, `${patient.path}?aba=bzn`);
  await visitByLink(page, `${patient.path}/registrar?tipo=bzn`);
  await expect(page.getByRole('heading', { name: 'Tratamento BZN já registrado', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Salvar registro', exact: true })).toHaveCount(0);
  await visitByLink(page, `${patient.path}?aba=bzn`);
  for (const [index, date, type] of [[1, '2026-05-08', 'retorno_bzn_30_dias'],
    [2, '2026-05-21', 'retorno_bzn_30_dias'], [3, '2026-06-20', 'retorno_bzn_final']] as const) {
    await visitByLink(page, `${patient.path}/registrar?tipo=retorno-bzn`);
    await page.getByLabel('Atendimento de registro', { exact: true }).selectOption(attendance.atendimentoId);
    await page.getByLabel('Tipo de retorno BZN', { exact: true }).selectOption(type);
    await expect(page.getByLabel('Data efetiva do comparecimento', { exact: true })).toHaveValue('');
    await page.getByLabel('Data efetiva do comparecimento', { exact: true }).fill(date);
    await page.getByLabel('Resumo do retorno', { exact: true }).fill(`Retorno BZN efetivo sintético ${index}`);
    if (index === 1) await assertAccessible(page);
    await submitWrite(page, 'POST', `${patient.path}/retornos-bzn`, 'Salvar registro');
    await visitByLink(page, `${patient.path}?aba=bzn`);
  }
  const returns = await apiJson<RetornoBznResponse[]>('GET', `${patient.path}/retornos-bzn`);
  expect(returns).toHaveLength(3);
  expect(returns).toEqual(expect.arrayContaining([
    expect.objectContaining({ tipo: 'retorno_bzn_30_dias', dataRealizada: '2026-05-08', resumo: 'Retorno BZN efetivo sintético 1' }),
    expect.objectContaining({ tipo: 'retorno_bzn_30_dias', dataRealizada: '2026-05-21', resumo: 'Retorno BZN efetivo sintético 2' }),
    expect.objectContaining({ tipo: 'retorno_bzn_final', dataRealizada: '2026-06-20', resumo: 'Retorno BZN efetivo sintético 3' }),
  ]));
  expect(new Set(returns.map(record => record.retornoId)).size).toBe(3);
  await visitByLink(page, `${patient.path}?aba=acompanhamento`);
  await visitByLink(page, `${patient.path}/registrar?tipo=ocorrencia-anual`);
  await expect(page.getByLabel('Atendimento de registro', { exact: true })).toHaveCount(0);
  await page.getByLabel('Ano de comparecimento informado', { exact: true }).fill('2024');
  await assertAccessible(page);
  await submitWrite(page, 'POST', `${patient.path}/ocorrencias-anuais`, 'Salvar registro');
  expect(await apiJson<ClinicalEventResponse[]>('GET', `${patient.path}/ocorrencias-anuais`)).toEqual([
    expect.objectContaining({ tipo: 'ultimo_comparecimento_ano_informado', ano: 2024, precisao: 'ano' }),
  ]);
  expect(await apiJson<unknown[]>('GET', `${patient.path}/atendimentos`)).toHaveLength(1);
  expect(await apiJson<AnnualReturnResponse[]>('GET', `${patient.path}/retornos-anuais`)).toHaveLength(0);
  await visitByLink(page, `${patient.path}?aba=acompanhamento`);
  for (const [index, date] of [[1, '2026-04-25'], [2, '2026-06-11']] as const) {
    await visitByLink(page, `${patient.path}/registrar?tipo=retorno-anual`);
    await page.getByLabel('Atendimento de registro', { exact: true }).selectOption(attendance.atendimentoId);
    await page.getByLabel('Data efetiva do comparecimento', { exact: true }).fill(date);
    await page.getByLabel('Resumo do retorno anual', { exact: true }).fill(`Retorno anual efetivo sintético ${index}`);
    if (index === 1) await assertAccessible(page);
    await submitWrite(page, 'POST', `${patient.path}/retornos-anuais`, 'Salvar registro');
    await visitByLink(page, `${patient.path}?aba=acompanhamento`);
  }
  const annual = await apiJson<AnnualReturnResponse[]>('GET', `${patient.path}/retornos-anuais`);
  expect(annual).toHaveLength(2);
  expect(annual).toEqual(expect.arrayContaining([
    expect.objectContaining({ dataRealizada: '2026-04-25', resumo: 'Retorno anual efetivo sintético 1' }),
    expect.objectContaining({ dataRealizada: '2026-06-11', resumo: 'Retorno anual efetivo sintético 2' }),
  ]));
  expect(new Set(annual.map(record => record.retornoId)).size).toBe(2);
  await assertNoPersistentClinicalState(page);
});

test('7C: projeto, notificação, encaminhamento, contrarreferências e resolução de pendência', async ({ page }) => {
  test.setTimeout(120_000);
  const patient = await seedPatient('Comunicação e pendência');
  const attendance = await seedAttendance(patient.path);
  const projects = await apiJson<Array<{ id: string; ativo: boolean }>>('GET', '/catalogos/projetos?limit=100&offset=0');
  const referralTypes = await apiJson<Array<{ id: string; ativo: boolean }>>('GET', '/catalogos/tipos-encaminhamento?limit=100&offset=0');
  expect(projects.length).toBeGreaterThan(0);
  expect(referralTypes.length).toBeGreaterThan(0);
  expect(projects.every(record => record.ativo)).toBe(true);
  expect(referralTypes.every(record => record.ativo)).toBe(true);
  const projectId = projects[0]!.id;
  await signIn(page, 'edicao', `${patient.path}/registrar?tipo=projeto`);
  await page.getByLabel('Projeto', { exact: true }).selectOption(projectId);
  await page.getByLabel('Participa do projeto?', { exact: true }).selectOption('true');
  await page.getByLabel('Descrição da pendência no projeto', { exact: true }).fill('Pendência do projeto com indicador desconhecido sintética');
  await page.getByLabel('Houve falha no projeto?', { exact: true }).selectOption('false');
  await page.getByLabel('Observações do projeto', { exact: true }).fill('Participação sintética original');
  await assertAccessible(page);
  await submitWrite(page, 'PUT', `${patient.path}/projetos`, 'Salvar registro');
  expect(await apiJson<ProjectResponse[]>('GET', `${patient.path}/projetos`)).toEqual([
    expect.objectContaining({ projetoId: projectId, participa: true, possuiPendencia: null,
      descricaoPendencia: 'Pendência do projeto com indicador desconhecido sintética', houveFalha: false,
      observacoes: 'Participação sintética original' }),
  ]);
  await visitByLink(page, `${patient.path}?aba=projetos`);
  await visitByLink(page, `${patient.path}/registrar?tipo=projeto`);
  await page.getByLabel('Projeto', { exact: true }).selectOption(projectId);
  await expect(page.getByLabel('Observações do projeto', { exact: true })).toHaveValue('Participação sintética original');
  await page.getByLabel('Observações do projeto', { exact: true }).fill('Participação sintética atualizada');
  const projectEdit = await submitWrite(page, 'PUT', `${patient.path}/projetos`, 'Salvar registro');
  expect(projectEdit.body).toEqual({ projetoId: projectId, observacoes: 'Participação sintética atualizada' });
  const updatedProject = (await apiJson<ProjectResponse[]>('GET', `${patient.path}/projetos`))[0]!;
  expect(updatedProject).toMatchObject({ participa: true, possuiPendencia: null,
    descricaoPendencia: 'Pendência do projeto com indicador desconhecido sintética', houveFalha: false,
    observacoes: 'Participação sintética atualizada' });
  await visitByLink(page, `${patient.path}?aba=projetos`);
  await visitByLink(page, `${patient.path}?aba=notificacao`);
  await visitByLink(page, `${patient.path}/registrar?tipo=notificacao`);
  await expect(page.getByLabel('Número da notificação', { exact: true })).toBeVisible();
  await page.getByLabel('Número da notificação', { exact: true }).fill('SINTETICO-ETAPA-7');
  await page.getByLabel('Justificativa de não notificação', { exact: true }).fill('Justificativa sintética com estado desconhecido');
  await page.getByLabel('Observações da notificação', { exact: true }).fill('Observação da notificação sintética');
  await assertAccessible(page);
  await submitWrite(page, 'PUT', `${patient.path}/notificacao`, 'Salvar registro');
  expect(await apiJson<NotificationResponse>('GET', `${patient.path}/notificacao`)).toMatchObject({
    pacienteNotificado: null, numeroNotificacao: 'SINTETICO-ETAPA-7',
    justificativaNaoNotificacao: 'Justificativa sintética com estado desconhecido', observacoes: 'Observação da notificação sintética',
  });
  await visitByLink(page, `${patient.path}?aba=notificacao`);
  await visitByLink(page, `${patient.path}?aba=encaminhamentos`);
  await visitByLink(page, `${patient.path}/registrar?tipo=encaminhamento`);
  await page.getByLabel('Atendimento de registro', { exact: true }).selectOption(attendance.atendimentoId);
  await page.getByLabel('Tipo de encaminhamento', { exact: true }).selectOption(referralTypes[0]!.id);
  await page.getByLabel('Projeto associado ao encaminhamento', { exact: true }).selectOption(projectId);
  await page.getByLabel('Origem do encaminhamento', { exact: true }).selectOption('projeto_pesquisa');
  await page.getByLabel('Nome do destino', { exact: true }).fill('Unidade destino sintética');
  await page.getByLabel('Serviço de destino', { exact: true }).fill('Serviço destino sintético');
  await page.getByLabel('Especialidade de destino', { exact: true }).fill('Especialidade sintética');
  await page.getByLabel('Data do encaminhamento', { exact: true }).fill('2026-04-04');
  await page.getByLabel('Data do agendamento', { exact: true }).fill('2026-05-10');
  await page.getByLabel('Status do encaminhamento', { exact: true }).selectOption('solicitado');
  await page.getByLabel('Prioridade', { exact: true }).selectOption('media');
  await page.getByLabel('Documento apresentado?', { exact: true }).selectOption('false');
  await page.getByLabel('Motivo do encaminhamento', { exact: true }).fill('Motivo sintético');
  await page.getByLabel('Conduta orientada', { exact: true }).fill('Conduta orientada sintética');
  await page.getByLabel('Observações do encaminhamento', { exact: true }).fill('Observação do encaminhamento sintética');
  await assertAccessible(page);
  const referralWrite = await submitWrite(page, 'POST', `${patient.path}/encaminhamentos`, 'Salvar registro');
  const referral = await referralWrite.response.json() as { encaminhamentoId: string };
  expect(await apiJson<ReferralResponse[]>('GET', `${patient.path}/encaminhamentos`)).toEqual([
    expect.objectContaining({ encaminhamentoId: referral.encaminhamentoId, atendimentoId: attendance.atendimentoId,
      tipoEncaminhamentoId: referralTypes[0]!.id, projetoId: projectId, origem: 'projeto_pesquisa',
      destinoNome: 'Unidade destino sintética', destinoServico: 'Serviço destino sintético', especialidadeDestino: 'Especialidade sintética',
      dataEncaminhamento: '2026-04-04', dataAgendamento: '2026-05-10', dataRealizacao: null,
      status: 'solicitado', prioridade: 'media', documentoApresentado: false, motivo: 'Motivo sintético',
      condutaOrientada: 'Conduta orientada sintética', observacoes: 'Observação do encaminhamento sintética' }),
  ]);
  await visitByLink(page, `${patient.path}?aba=encaminhamentos`);
  for (const [index, status, date] of [[1, 'pendente', ''], [2, 'concluido', '2026-06-21']] as const) {
    await visitByLink(page, `${patient.path}/registrar?tipo=contrarreferencia`);
    await page.getByLabel('Encaminhamento de origem', { exact: true }).selectOption(referral.encaminhamentoId);
    await page.getByLabel('Status da contrarreferência', { exact: true }).selectOption(status);
    if (date) await page.getByLabel('Data de realização da contrarreferência', { exact: true }).fill(date);
    await page.getByLabel('Resumo da contrarreferência', { exact: true }).fill(`Contrarreferência repetida sintética ${index}`);
    await page.getByLabel('Conduta da contrarreferência', { exact: true }).fill(`Conduta da contrarreferência sintética ${index}`);
    await page.getByLabel('Observações da contrarreferência', { exact: true }).fill(`Observação da contrarreferência sintética ${index}`);
    if (index === 1) await assertAccessible(page);
    await submitWrite(page, 'POST', `${patient.path}/encaminhamentos/${referral.encaminhamentoId}/contrarreferencias`, 'Salvar registro');
    await visitByLink(page, `${patient.path}?aba=encaminhamentos`);
  }
  const counters = await apiJson<CounterReferralResponse[]>('GET', `${patient.path}/encaminhamentos/${referral.encaminhamentoId}/contrarreferencias`);
  expect(counters).toHaveLength(2);
  expect(counters).toEqual(expect.arrayContaining([
    expect.objectContaining({ encaminhamentoId: referral.encaminhamentoId, atendimentoId: attendance.atendimentoId,
      status: 'pendente', dataRealizada: null, resumo: 'Contrarreferência repetida sintética 1',
      conduta: 'Conduta da contrarreferência sintética 1', observacoes: 'Observação da contrarreferência sintética 1' }),
    expect.objectContaining({ encaminhamentoId: referral.encaminhamentoId, atendimentoId: attendance.atendimentoId,
      status: 'concluido', dataRealizada: '2026-06-21', resumo: 'Contrarreferência repetida sintética 2' }),
  ]));
  expect(new Set(counters.map(record => record.contrarreferenciaId)).size).toBe(2);
  await visitByLink(page, `${patient.path}?aba=pendencias`);
  await visitByLink(page, `${patient.path}/registrar?tipo=pendencia`);
  await page.getByLabel('Atendimento de registro', { exact: true }).selectOption(attendance.atendimentoId);
  await page.getByLabel('Descrição da pendência', { exact: true }).fill('Pendência posterior sintética');
  await page.getByLabel('Data de identificação da pendência', { exact: true }).fill('2026-04-04');
  await assertAccessible(page);
  const pendingWrite = await submitWrite(page, 'POST', `${patient.path}/pendencias`, 'Salvar registro');
  const pending = await pendingWrite.response.json() as { pendenciaId: string };
  await visitByLink(page, `${patient.path}?aba=pendencias`);
  await visitByLink(page, `${patient.path}/registrar?tipo=pendencia`);
  await page.getByLabel('Pendência existente', { exact: true }).selectOption(pending.pendenciaId);
  await page.getByLabel('Status da pendência', { exact: true }).selectOption('resolvida');
  await expect(page.getByRole('option', { name: 'Localizado', exact: true })).toHaveCount(0);
  let pendingPatches = 0;
  page.on('request', request => { if (request.method() === 'PATCH' && new URL(request.url()).pathname === `/v1${patient.path}/pendencias/${pending.pendenciaId}`) pendingPatches++; });
  await page.getByRole('button', { name: 'Salvar registro', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(/data.*resolução/i);
  expect(pendingPatches).toBe(0);
  await page.getByLabel('Data de resolução da pendência', { exact: true }).fill('2026-05-10');
  await assertAccessible(page);
  await submitWrite(page, 'PATCH', `${patient.path}/pendencias/${pending.pendenciaId}`, 'Salvar registro');
  expect(await apiJson<unknown[]>('GET', `${patient.path}/pendencias`)).toEqual([
    expect.objectContaining({ pendenciaId: pending.pendenciaId, atendimentoId: attendance.atendimentoId,
      descricao: 'Pendência posterior sintética', status: 'resolvida', dataIdentificacao: '2026-04-04', dataResolucao: '2026-05-10' }),
  ]);
  expect(pendingPatches).toBe(1);
  expect(await apiJson<unknown[]>('GET', `${patient.path}/atendimentos`)).toHaveLength(1);
});

test('7D: resposta perdida após commit exige verificação e não repete atendimento', async ({ page }) => {
  const patient = await seedPatient('Resposta perdida');
  await signIn(page, 'edicao', `${patient.path}/atendimentos/novo`);
  await page.getByLabel('Data do atendimento', { exact: true }).fill('2026-04-07');
  await page.getByLabel('Observações do atendimento', { exact: true }).fill('Atendimento com resposta perdida sintético');
  const lost = await loseResponseAfterCommit(page, 'POST', `${patient.path}/atendimentos`);
  await page.getByRole('button', { name: 'Salvar atendimento', exact: true }).click();
  const committed = await lost.committed;
  expect(committed.status()).toBe(201);
  const created = await committed.json() as { atendimentoId: string };
  await expect(page.getByRole('alert')).toContainText(/não foi possível confirmar.*salva/i);
  await expect(page.getByRole('button', { name: 'Salvar atendimento', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Observações do atendimento', { exact: true })).toHaveValue('Atendimento com resposta perdida sintético');
  await expect(page.getByText(/Atendimento salvo\./)).toHaveCount(0);
  await page.getByRole('link', { name: 'Verificar registro salvo', exact: true }).click();
  await page.getByRole('dialog', { name: 'Alterações não salvas', exact: true }).getByRole('button', { name: 'Sair e manter rascunho', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/pacientes/${patient.pacienteId}\\?aba=atendimentos$`));
  await expect(page.getByText('Atendimento com resposta perdida sintético', { exact: true })).toBeVisible();
  expect((await readAttendance(`${patient.path}/atendimentos/${created.atendimentoId}`)).observacoes).toBe('Atendimento com resposta perdida sintético');
  expect(await apiJson<unknown[]>('GET', `${patient.path}/atendimentos`)).toHaveLength(1);
  await page.goBack();
  await expect(page.getByRole('alert')).toContainText(/não foi possível confirmar.*salva/i);
  await expect(page.getByLabel('Observações do atendimento', { exact: true })).toHaveValue('Atendimento com resposta perdida sintético');
  await expect(page.getByRole('button', { name: 'Salvar atendimento', exact: true })).toBeDisabled();
  await page.waitForLoadState('networkidle');
  expect(lost.writes()).toBe(1);
  expect(await apiJson<unknown[]>('GET', `${patient.path}/atendimentos`)).toHaveLength(1);
});

test('7D: conflito no acompanhamento conserva o atendimento confirmado e o rascunho posterior', async ({ page }) => {
  const patient = await seedPatient('Confirmação parcial');
  await signIn(page, 'edicao', `${patient.path}/atendimentos/novo`);
  await page.getByLabel('Data do atendimento', { exact: true }).fill('2026-04-08');
  await page.getByLabel('Observações do atendimento', { exact: true }).fill('Atendimento confirmado antes do módulo sintético');
  const first = await submitWrite(page, 'POST', `${patient.path}/atendimentos`, 'Salvar atendimento');
  const attendance = await first.response.json() as { atendimentoId: string };
  await expect(page.getByText(/Atendimento salvo.*confirmação própria/)).toBeVisible();
  await visitByLink(page, `${patient.path}/registrar?tipo=bzn`);
  await expect(page.getByLabel('Atendimento de registro', { exact: true })).toBeVisible();
  await page.getByLabel('Atendimento de registro', { exact: true }).selectOption(attendance.atendimentoId);
  await page.getByLabel('Tratamento iniciado?', { exact: true }).selectOption('true');
  await page.getByLabel('Observações do tratamento', { exact: true }).fill('Rascunho BZN após atendimento sintético');
  const canonical = await apiJson<{ tratamentoId: string }>('POST', `${patient.path}/tratamento-bzn`, {
    atendimentoId: attendance.atendimentoId, iniciado: false, observacoes: 'BZN concorrente sintético',
  });
  await submitWrite(page, 'POST', `${patient.path}/tratamento-bzn`, 'Salvar registro', 409);
  await expect(page.getByRole('alert')).toContainText(/alterado|conflito|revis/i);
  await expect(page.getByLabel('Observações do tratamento', { exact: true })).toHaveValue('Rascunho BZN após atendimento sintético');
  await expect(page.getByText('Registro salvo.', { exact: true })).toHaveCount(0);
  expect(await apiJson<unknown[]>('GET', `${patient.path}/atendimentos`)).toHaveLength(1);
  expect((await readAttendance(`${patient.path}/atendimentos/${attendance.atendimentoId}`)).observacoes).toBe('Atendimento confirmado antes do módulo sintético');
  expect(await apiJson<TratamentoBznResponse>('GET', `${patient.path}/tratamento-bzn`)).toMatchObject({
    tratamentoId: canonical.tratamentoId, iniciado: false, observacoes: 'BZN concorrente sintético',
  });
});

test('7D: 401 real em escrita encerra sessão e remove rascunho clínico', async ({ page }) => {
  const patient = await seedPatient('Escrita sem identidade');
  const original = await readPatient(patient.path);
  await signIn(page, 'edicao', `${patient.path}/editar`);
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue(original.nome);
  await page.getByLabel('Nome completo', { exact: true }).fill('Etapa 7 rascunho após401 Sintético');
  try {
    await setUserActive('edicao', false);
    await submitWrite(page, 'PATCH', patient.path, 'Salvar paciente', 401);
    await expect(page.getByLabel('Usuário', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Nome completo', { exact: true })).toHaveCount(0);
    await assertNoPersistentClinicalState(page);
  } finally { await setUserActive('edicao', true); }
  expect((await readPatient(patient.path)).nome).toBe(original.nome);
  await signIn(page, 'edicao', `${patient.path}/editar`);
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue(original.nome);
});

test('7D: resposta antiga de escrita não navega nem mostra sucesso após trocar identidade', async ({ page }) => {
  const patient = await seedPatient('Resposta de outra sessão');
  await apiJson('PUT', `${patient.path}/acesso/${fixture.users.consulta.usuarioId}`, { ativo: false, podeEditar: false });
  await signIn(page, 'edicao', `${patient.path}/atendimentos/novo`);
  await page.getByLabel('Data do atendimento', { exact: true }).fill('2026-04-09');
  await page.getByLabel('Observações do atendimento', { exact: true }).fill('Escrita de sessão anterior sintética');
  const delayed = await delayOneApiResponse(page, `**/v1${patient.path}/atendimentos`);
  await page.getByRole('button', { name: 'Salvar atendimento', exact: true }).click();
  await delayed.fetched;
  expect(await apiJson<unknown[]>('GET', `${patient.path}/atendimentos`)).toHaveLength(1);
  try {
    await expect(page.getByRole('button', { name: 'Salvando…', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Sair', exact: true }).click();
    await expect(page.getByLabel('Usuário', { exact: true })).toBeVisible();
    await signIn(page, 'consulta');
    await expect(page.getByRole('heading', { name: 'Início', exact: true })).toBeVisible();
  } finally { delayed.release(); }
  await delayed.done;
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Início', exact: true })).toBeVisible();
  await expect(page.getByText(/Atendimento salvo\./)).toHaveCount(0);
  await expect(page.getByText('Escrita de sessão anterior sintética', { exact: true })).toHaveCount(0);
  expect((await apiAs('consulta', 'GET', `${patient.path}/atendimentos`)).status).toBe(403);
  await assertNoPersistentClinicalState(page);
});

test('7A/7D: política clínica impede formulário de cadastro mesmo com perfil de edição', async ({ page }) => {
  expect(await apiJson('GET', '/pacientes/capacidades', undefined, 'edicao')).toEqual({ podeCadastrar: false });
  const capability = page.waitForResponse(response => response.request().method() === 'GET'
    && new URL(response.url()).pathname === '/v1/pacientes/capacidades');
  let writes = 0;
  page.on('request', request => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/v1/pacientes') writes++;
  });
  await signIn(page, 'edicao', '/pacientes/novo');
  expect(await (await capability).json()).toEqual({ podeCadastrar: false });
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Cadastrar paciente', exact: true })).toHaveCount(0);
  await page.getByRole('navigation', { name: 'Menu principal' }).getByRole('link', { name: 'Pacientes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pacientes', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Cadastrar paciente', exact: true })).toHaveCount(0);
  await page.waitForLoadState('networkidle');
  expect(writes).toBe(0);
});

test('7D: perda da resposta do PATCH confirma pela ficha sem repetir alteração versionada', async ({ page }) => {
  const patient = await seedPatient('PATCH resposta perdida', {
    endereco: { endereco: 'Rua preservada após PATCH sintética', cidade: 'Cidade preservada sintética' },
    telefones: ['000000011'],
  });
  const original = await readPatient(patient.path);
  const name = 'Etapa 7 nome salvo com resposta PATCH perdida Sintético';
  await signIn(page, 'edicao', `${patient.path}/editar`);
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue(original.nome);
  await page.getByLabel('Nome completo', { exact: true }).fill(name);
  const lost = await loseResponseAfterCommit(page, 'PATCH', patient.path);
  await page.getByRole('button', { name: 'Salvar paciente', exact: true }).click();
  const committed = await lost.committed;
  expect(committed.status()).toBe(200);
  expect(lost.requestBody()).toEqual({ versao: original.versao, nome: name });
  const updated = await readPatient(patient.path);
  expect(updated).toMatchObject({ nome: name, endereco: original.endereco, telefones: original.telefones });
  expect(BigInt(updated.versao)).toBeGreaterThan(BigInt(original.versao));
  await expect(page.getByRole('alert')).toContainText(/não foi possível confirmar.*salva/i);
  await expect(page.getByRole('button', { name: 'Salvar paciente', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue(name);
  await expect(page.getByText('Paciente salvo.', { exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Verificar registro salvo', exact: true }).click();
  await page.getByRole('dialog', { name: 'Alterações não salvas', exact: true })
    .getByRole('button', { name: 'Sair e manter rascunho', exact: true }).click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('alert')).toContainText(/não foi possível confirmar.*salva/i);
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue(name);
  await expect(page.getByRole('button', { name: 'Salvar paciente', exact: true })).toBeDisabled();
  await page.waitForLoadState('networkidle');
  expect(lost.writes()).toBe(1);
  expect((await readPatient(patient.path)).versao).toBe(updated.versao);
  await assertNoPersistentClinicalState(page);
});

for (const kind of ['retorno-anual', 'contrarreferencia'] as const) {
  test(`7D: resposta perdida de ${kind} preserva episódio único e sua intenção ao voltar`, async ({ page }) => {
    const patient = await seedPatient(`Resposta perdida ${kind}`);
    const attendance = await seedAttendance(patient.path);
    let resource = `${patient.path}/retornos-anuais`;
    let referralId = '';
    if (kind === 'contrarreferencia') {
      const referral = await apiJson<{ encaminhamentoId: string }>('POST', `${patient.path}/encaminhamentos`, {
        atendimentoId: attendance.atendimentoId, destinoNome: 'Destino para resposta perdida sintético',
      });
      referralId = referral.encaminhamentoId;
      resource = `${patient.path}/encaminhamentos/${referralId}/contrarreferencias`;
    }
    const summaryLabel = kind === 'retorno-anual' ? 'Resumo do retorno anual' : 'Resumo da contrarreferência';
    const dateLabel = kind === 'retorno-anual' ? 'Data efetiva do comparecimento' : 'Data de realização da contrarreferência';
    const summary = `Etapa 7 ${kind} confirmado com resposta perdida Sintético`;
    await signIn(page, 'edicao', `${patient.path}/registrar?tipo=${kind}`);
    if (kind === 'retorno-anual') {
      await page.getByLabel('Atendimento de registro', { exact: true }).selectOption(attendance.atendimentoId);
    } else {
      await page.getByLabel('Encaminhamento de origem', { exact: true }).selectOption(referralId);
      await page.getByLabel('Status da contrarreferência', { exact: true }).selectOption('concluido');
    }
    await page.getByLabel(dateLabel, { exact: true }).fill('2026-04-10');
    await page.getByLabel(summaryLabel, { exact: true }).fill(summary);
    const lost = await loseResponseAfterCommit(page, 'POST', resource);
    await page.getByRole('button', { name: 'Salvar registro', exact: true }).click();
    expect((await lost.committed).status()).toBe(201);
    await expect(page.getByRole('alert')).toContainText(/não foi possível confirmar.*salva/i);
    await expect(page.getByLabel(summaryLabel, { exact: true })).toHaveValue(summary);
    await expect(page.getByRole('button', { name: 'Salvar registro', exact: true })).toBeDisabled();
    await expect(page.getByText('Registro salvo.', { exact: true })).toHaveCount(0);
    await page.getByRole('link', { name: 'Verificar registro salvo', exact: true }).click();
    await page.getByRole('dialog', { name: 'Alterações não salvas', exact: true })
      .getByRole('button', { name: 'Sair e manter rascunho', exact: true }).click();
    await expect(page.getByText(summary, { exact: true })).toBeVisible();
    if (kind === 'contrarreferencia') {
      expect(new URL(page.url()).searchParams.get('contrarreferencia')).toBe(referralId);
    }
    const confirmed = await apiJson<Array<AnnualReturnResponse | CounterReferralResponse>>('GET', resource);
    expect(confirmed).toHaveLength(1);
    expect(confirmed[0]).toMatchObject({ atendimentoId: attendance.atendimentoId, dataRealizada: '2026-04-10', resumo: summary });
    await page.goBack();
    await expect(page.getByRole('alert')).toContainText(/não foi possível confirmar.*salva/i);
    await expect(page.getByLabel(summaryLabel, { exact: true })).toHaveValue(summary);
    await expect(page.getByLabel(dateLabel, { exact: true })).toHaveValue('2026-04-10');
    await expect(page.getByRole('button', { name: 'Salvar registro', exact: true })).toBeDisabled();
    await page.waitForLoadState('networkidle');
    expect(lost.writes()).toBe(1);
    expect(await apiJson('GET', resource)).toEqual(confirmed);
    expect(await apiJson<unknown[]>('GET', `${patient.path}/atendimentos`)).toHaveLength(1);
    await assertNoPersistentClinicalState(page);
  });
}

test('7D: falha de rede na revalidação durante escrita oculta e recupera a intenção incerta sem duplicar', async ({ page }) => {
  const patient = await seedPatient('Revalidação de escrita');
  const attendance = await seedAttendance(patient.path);
  const summary = 'Etapa 7 retorno salvo antes de perder revalidação Sintético';
  const resource = `${patient.path}/retornos-anuais`;
  await signIn(page, 'edicao', `${patient.path}/registrar?tipo=retorno-anual`);
  await page.getByLabel('Atendimento de registro', { exact: true }).selectOption(attendance.atendimentoId);
  await page.getByLabel('Data efetiva do comparecimento', { exact: true }).fill('2026-04-11');
  await page.getByLabel('Resumo do retorno anual', { exact: true }).fill(summary);
  let writes = 0;
  page.on('request', request => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === `/v1${resource}`) writes++;
  });
  const delayed = await delayOneApiResponse(page, `**/v1${resource}`);
  await page.getByRole('button', { name: 'Salvar registro', exact: true }).click();
  await delayed.fetched;
  expect(await apiJson<unknown[]>('GET', resource)).toHaveLength(1);
  let unavailable = true;
  await page.route('**/v1/auth/me', route => unavailable ? route.abort('connectionreset') : route.continue());
  try {
    await resumePage(page);
    await expect(page.getByRole('alert')).toContainText(/não foi possível conectar/i);
    await expect(page.getByLabel('Resumo do retorno anual', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Salvar registro', exact: true })).toHaveCount(0);
    await expect(page.getByText('Registro salvo.', { exact: true })).toHaveCount(0);
    await assertAccessible(page);
  } finally {
    unavailable = false;
    delayed.release();
  }
  await delayed.done;
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByLabel('Resumo do retorno anual', { exact: true })).toHaveValue(summary);
  await expect(page.getByRole('alert')).toContainText(/não foi possível confirmar.*salva/i);
  await expect(page.getByRole('button', { name: 'Salvar registro', exact: true })).toBeDisabled();
  await page.getByRole('link', { name: 'Verificar registro salvo', exact: true }).click();
  await page.getByRole('dialog', { name: 'Alterações não salvas', exact: true })
    .getByRole('button', { name: 'Sair e manter rascunho', exact: true }).click();
  await expect(page.getByText(summary, { exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByLabel('Resumo do retorno anual', { exact: true })).toHaveValue(summary);
  await expect(page.getByRole('button', { name: 'Salvar registro', exact: true })).toBeDisabled();
  await page.waitForLoadState('networkidle');
  expect(writes).toBe(1);
  expect(await apiJson<AnnualReturnResponse[]>('GET', resource)).toEqual([
    expect.objectContaining({ atendimentoId: attendance.atendimentoId, dataRealizada: '2026-04-11', resumo: summary }),
  ]);
  await assertNoPersistentClinicalState(page);
});

test('7D: reconsulta com vínculo revogado oculta formulário antes da resposta e conserva o rascunho', async ({ page }) => {
  const patient = await seedPatient('Rascunho com acesso revalidado');
  const original = await readPatient(patient.path);
  const attendance = await seedAttendance(patient.path);
  const summary = 'Etapa 7 rascunho aguardando vínculo revalidado Sintético';
  const resource = `${patient.path}/retornos-anuais`;
  await signIn(page, 'edicao', `${patient.path}/registrar?tipo=retorno-anual`);
  await page.getByLabel('Atendimento de registro', { exact: true }).selectOption(attendance.atendimentoId);
  await page.getByLabel('Data efetiva do comparecimento', { exact: true }).fill('2026-04-12');
  await page.getByLabel('Resumo do retorno anual', { exact: true }).fill(summary);
  let writes = 0;
  page.on('request', request => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === `/v1${resource}`) writes++;
  });
  await apiJson('PUT', `${patient.path}/acesso/${fixture.users.edicao.usuarioId}`, { ativo: false, podeEditar: false });
  const delayed = await delayOneApiResponse(page, `**/v1${patient.path}?limit=1&offset=0`);
  try {
    await resumePage(page);
    await delayed.fetched;
    await expect(page.getByLabel('Resumo do retorno anual', { exact: true })).not.toBeVisible();
    await expect(page.getByRole('heading', { name: original.nome, exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Salvar registro', exact: true })).toHaveCount(0);
    expect(writes).toBe(0);
  } finally { delayed.release(); }
  await delayed.done;
  await expect(page.getByRole('alert')).toContainText(/acesso|permissão|autoriza/i);
  await expect(page.getByLabel('Resumo do retorno anual', { exact: true })).not.toBeVisible();
  await apiJson('PUT', `${patient.path}/acesso/${fixture.users.edicao.usuarioId}`, { ativo: true, podeEditar: true });
  await resumePage(page);
  await expect(page.getByLabel('Resumo do retorno anual', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Resumo do retorno anual', { exact: true })).toHaveValue(summary);
  await expect(page.getByLabel('Data efetiva do comparecimento', { exact: true })).toHaveValue('2026-04-12');
  await expect(page.getByRole('button', { name: 'Salvar registro', exact: true })).toBeEnabled();
  await page.waitForLoadState('networkidle');
  expect(writes).toBe(0);
  expect(await apiJson<AnnualReturnResponse[]>('GET', resource)).toHaveLength(0);
  await assertNoPersistentClinicalState(page);
});
