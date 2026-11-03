import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { apiAs, fixture, type Perfil } from './fixtures';
import { apiJson, assertAccessible, assertFitsViewport, attendanceSection, loseResponseAfterCommit,
  readAttendance, reviewAttendance, seedPatient, signIn, submitWrite } from './stage7-helpers';

const requireBackend = createRequire(resolve(__dirname, '../../backend/package.json'));
const { Pool } = requireBackend('pg');
const { sign } = requireBackend('jsonwebtoken');
interface CatalogRow { id: string; nome: string; codigo: string; ativo: boolean }
interface Receipt { atendimentoId: string; [key: string]: string }

// Read-only assertions against the same disposable database as the real API.
async function sql<T>(query: string, values: unknown[] = []): Promise<T[]> {
  const connection = new Pool({ host: process.env.PGHOST, port: Number(process.env.PGPORT),
    user: process.env.PGUSER, password: process.env.PGPASSWORD, database: process.env.FRONTEND_E2E_DB });
  try { return (await connection.query(query, values)).rows as T[]; }
  finally { await connection.end(); }
}
async function counts(patientId: string) {
  return (await sql<Record<string, number>>(`SELECT
    (SELECT count(*)::int FROM ambulatorio.atendimento WHERE paciente_id=$1) AS atendimentos,
    (SELECT count(*)::int FROM ambulatorio.evento_clinico WHERE paciente_id=$1 AND tipo_evento='avc') AS avcs,
    (SELECT count(*)::int FROM ambulatorio.dispositivo_implantado WHERE paciente_id=$1) AS dispositivos,
    (SELECT count(*)::int FROM ambulatorio.obito WHERE paciente_id=$1) AS obitos,
    (SELECT count(*)::int FROM ambulatorio.paciente_projeto_estudo WHERE paciente_id=$1) AS projetos,
    (SELECT count(*)::int FROM ambulatorio.tratamento_benzonidazol WHERE paciente_id=$1) AS bzn,
    (SELECT count(*)::int FROM ambulatorio.notificacao WHERE paciente_id=$1) AS notificacoes`, [patientId]))[0]!;
}
function ordered(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(ordered);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, ordered((value as Record<string, unknown>)[key])]));
  return value;
}
async function correlated(perfil: Perfil, path: string, body: Record<string, unknown>, operationId = randomUUID(), beforeSend?: () => Promise<void>) {
  const hash = createHash('sha256').update(JSON.stringify(ordered(body))).digest('hex');
  const registration = await apiAs(perfil, 'POST', '/operacoes', {
    operacaoId: operationId, metodo: 'POST', caminho: `/v1${path}`, corpoHash: hash,
  });
  expect(registration.status).toBe(201);
  await beforeSend?.();
  const [user] = await sql<{ ver: string }>('SELECT geracao_sessao::text AS ver FROM ambulatorio.usuario_aplicacao WHERE usuario_id=$1',
    [fixture.users[perfil].usuarioId]);
  const token = sign({ sub: fixture.users[perfil].usuarioId, typ: 'access', ver: user!.ver },
    process.env.AUTH_JWT_SECRET, { expiresIn: 120 });
  const send = () => fetch(`${process.env.FRONTEND_API_TARGET}/v1${path}`, { method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'x-operacao-id': operationId }, body: JSON.stringify(body) });
  return { response: await send(), send, operationId };
}
const add = (page: Page, title: string) => page.getByRole('button', { name: `Adicionar ${title}`, exact: true }).click();
const field = (page: Page, label: string) => page.getByLabel(`${label} 1`, { exact: true });

// This test deliberately uses every section, including explicit new longitudinal
// records. None of those records is inferred from navigating or from old history.
test('P0 fluxo único: doze seções, revisão, uma confirmação, releitura HTTP e SQL, novo atendimento vazio', async ({ page }, info) => {
  test.setTimeout(240_000);
  const patient = await seedPatient('Fluxo único integral');
  const path = `${patient.path}/atendimentos/confirmacao`;
  const catalogs = await Promise.all(['projetos', 'comorbidades', 'exames'].map(kind =>
    apiJson<CatalogRow[]>('GET', `/catalogos/${kind}?limit=100`)));
  const project = catalogs[0]!.find(row => row.ativo)!;
  const comorbidity = catalogs[1]!.find(row => row.ativo)!;
  const exam = catalogs[2]!.find(row => row.ativo)!;
  expect(project).toBeDefined(); expect(comorbidity).toBeDefined(); expect(exam).toBeDefined();
  await signIn(page, 'edicao', `${patient.path}/atendimentos/novo`);
  const writes: string[] = [];
  page.on('request', request => { if (request.method() === 'POST' && new URL(request.url()).pathname === `/v1${path}`)
    writes.push(request.headers()['x-operacao-id']!); });
  await page.getByLabel('Data do atendimento', { exact: true }).fill('2026-04-12');
  await page.getByLabel('Observações do atendimento', { exact: true }).fill('Fluxo integral exclusivamente sintético');
  await attendanceSection(page, 'Chagas e Sorologia');
  await page.getByLabel('Possui diagnóstico de Chagas', { exact: true }).selectOption('nao');
  await add(page, 'sorologia'); await field(page, 'Método sorológico').fill('Método sintético');
  await field(page, 'Resultado sorológico').selectOption('inconclusivo');
  await attendanceSection(page, 'Condição Clínica');
  await add(page, 'condição de Chagas'); await field(page, 'Forma clínica').selectOption('indeterminada');
  await field(page, 'Possui sintomas').selectOption('desconhecido');
  await add(page, 'complicação de Chagas'); await field(page, 'Possui complicação').selectOption('nao');
  await field(page, 'Descrição da complicação').fill('Descrição independente sintética');
  await attendanceSection(page, 'Comorbidades');
  await add(page, 'avaliação de comorbidade'); await field(page, 'Comorbidade').selectOption(comorbidity.id);
  await field(page, 'Possui comorbidade').selectOption('nao');
  await add(page, 'histórico familiar'); await field(page, 'Possui doença na família').selectOption('desconhecido');
  await attendanceSection(page, 'Avaliação Clínica');
  await page.getByLabel('Peso (kg)', { exact: true }).fill('65.25');
  await attendanceSection(page, 'Eventos e Dispositivos');
  await add(page, 'AVC'); await field(page, 'Ocorreu AVC').selectOption('sim');
  await field(page, 'Ano do AVC').fill('2012');
  await add(page, 'dispositivo'); await field(page, 'Tipo de dispositivo').selectOption('cdi');
  await field(page, 'Possui dispositivo').selectOption('nao');
  await add(page, 'óbito'); await field(page, 'Houve óbito').selectOption('nao');
  await attendanceSection(page, 'Projetos');
  await add(page, 'projeto'); await field(page, 'Projeto').selectOption(project.id);
  await field(page, 'Participa do projeto').selectOption('nao');
  await attendanceSection(page, 'Exames');
  await page.getByRole('button', { name: 'Adicionar exame', exact: true }).click();
  await page.getByLabel('Tipo de exame 1', { exact: true }).selectOption(exam.id);
  await page.getByLabel('Identificação do exame 1', { exact: true }).fill('Identificação sintética');
  await attendanceSection(page, 'Medicamentos e BZN');
  await add(page, 'tratamento BZN'); await field(page, 'Tem indicação de BZN').selectOption('nao');
  await field(page, 'Motivo de não indicação').fill('Motivo sintético informado, sem inferência');
  await attendanceSection(page, 'Encaminhamentos');
  await add(page, 'encaminhamento'); await field(page, 'Nome do destino').fill('Serviço exclusivamente sintético');
  await field(page, 'Documento apresentado').selectOption('desconhecido');
  await attendanceSection(page, 'Notificação');
  await add(page, 'notificação'); await field(page, 'Paciente notificado').selectOption('nao');
  await field(page, 'Justificativa de não notificação').fill('Justificativa exclusivamente sintética');
  await attendanceSection(page, 'Observações');
  await page.getByRole('button', { name: 'Adicionar pendência', exact: true }).click();
  await page.getByLabel('Descrição da pendência 1', { exact: true }).fill('Conferência sintética');

  // Free navigation preserves exact decimals and intentional unknown/negative values.
  await attendanceSection(page, 'Avaliação Clínica'); await expect(page.getByLabel('Peso (kg)', { exact: true })).toHaveValue('65.25');
  await attendanceSection(page, 'Condição Clínica'); await expect(field(page, 'Possui sintomas')).toHaveValue('desconhecido');
  await attendanceSection(page, 'Projetos'); await expect(field(page, 'Participa do projeto')).toHaveValue('nao');
  expect(writes).toEqual([]); expect((await counts(patient.pacienteId)).atendimentos).toBe(0);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1440 ? 960 : 844 });
    await assertAccessible(page); await assertFitsViewport(page);
    for (const select of await page.locator('.attendance-content select:visible').all()) {
      expect((await select.boundingBox())!.height).toBeLessThan(60);
    }
    await page.screenshot({ path: info.outputPath(`fluxo-unico-projetos-${width}.png`), fullPage: true });
  }
  for (const section of ['Atendimento', 'Chagas e Sorologia', 'Condição Clínica', 'Comorbidades',
    'Avaliação Clínica', 'Eventos e Dispositivos', 'Exames', 'Medicamentos e BZN', 'Encaminhamentos', 'Notificação', 'Observações']) {
    await attendanceSection(page, section);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 1440 ? 960 : 844 });
      await assertAccessible(page); await assertFitsViewport(page);
      await page.screenshot({ path: info.outputPath(`fluxo-unico-${section}-${width}.png`), fullPage: true });
    }
  }
  await reviewAttendance(page);
  const review = page.getByRole('group', { name: 'Revisão do atendimento', exact: true });
  for (const text of ['Método sintético', '65.25', '2012', 'Serviço exclusivamente sintético', 'Justificativa exclusivamente sintética'])
    await expect(review).toContainText(text);
  await assertAccessible(page); await page.screenshot({ path: info.outputPath('fluxo-unico-revisao-320.png'), fullPage: true });
  const saved = await submitWrite(page, 'POST', path, 'Confirmar atendimento');
  const receipt = await saved.response.json() as Receipt;
  expect(Object.keys(receipt).sort()).toEqual(['atendimentoId', 'avaliacaoComorbidadesId', 'avc0Id', 'complicacao0Id',
    'condicaoChagasId', 'dispositivo0Id', 'encaminhamento0Id', 'notificacaoId', 'obitoId', 'projeto0Id', 'sorologia0Id', 'tratamentoId'].sort());
  expect(writes).toHaveLength(1);
  expect(await apiJson('GET', `/operacoes/${writes[0]}`, undefined, 'edicao')).toMatchObject({ estado: 'confirmada', resultado: receipt });
  const attendancePath = `${patient.path}/atendimentos/${receipt.atendimentoId}`;
  expect(await readAttendance(attendancePath)).toMatchObject({ dadosClinicos: { pesoKg: '65.25' },
    diagnosticoChagas: { possuiDiagnosticoChagas: false }, pendencias: [{ descricao: 'Conferência sintética' }] });
  expect(await apiJson('GET', `${attendancePath}/condicao-chagas`)).toMatchObject({ possuiSintomas: null, formaClinica: 'indeterminada' });
  expect(await apiJson('GET', `${attendancePath}/sorologias`)).toMatchObject([{ metodoSorologico: 'Método sintético', resultado: 'inconclusivo' }]);
  expect(await apiJson('GET', `${attendancePath}/comorbidades`)).toMatchObject({ itens: [{ possuiComorbidade: false }], historicoFamiliar: { possuiDoenca: null } });
  expect(await apiJson('GET', `${patient.path}/tratamento-bzn`)).toMatchObject({ temIndicacao: false, atendimentoId: null });
  expect(await counts(patient.pacienteId)).toEqual({ atendimentos: 1, avcs: 1, dispositivos: 1, obitos: 1, projetos: 1, bzn: 1, notificacoes: 1 });
  const [event] = await sql<{ paciente_id: string; ano_evento: number }>(
    'SELECT paciente_id::text,ano_evento FROM ambulatorio.evento_clinico WHERE evento_clinico_id=$1', [receipt.avc0Id]);
  expect(event).toEqual({ paciente_id: patient.pacienteId, ano_evento: 2012 });
  for (const [table, id] of [['atendimento', receipt.atendimentoId], ['sorologia_chagas', receipt.sorologia0Id],
    ['evento_clinico', receipt.avc0Id]] as const) {
    const audit = await sql<{ origem: string; ator: string; importacao_linha_id: string | null; revisao_alvo_id: string | null }>(
      `SELECT e.origem,e.ator_usuario_id::text AS ator,e.importacao_linha_id::text,e.revisao_alvo_id::text
       FROM ambulatorio.auditoria_campo_evento e JOIN ambulatorio.auditoria_campo c USING(campo_id)
       WHERE c.tabela_destino=$1 AND e.registro_id=$2`, [table, id]);
    expect(audit.length).toBeGreaterThan(0);
    expect(audit.every(row => row.origem === 'aplicacao' && row.ator === fixture.users.edicao.usuarioId
      && row.importacao_linha_id === null && row.revisao_alvo_id === null)).toBe(true);
  }
  await expect(page.getByRole('heading', { name: 'Confirmação concluída', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Consultar atendimento confirmado', exact: true })).toHaveAttribute('href', attendancePath);
  await page.getByRole('button', { name: 'Iniciar novo atendimento', exact: true }).click();
  await expect(page.getByLabel('Data do atendimento', { exact: true })).toHaveValue('');
  await attendanceSection(page, 'Avaliação Clínica'); await expect(page.getByLabel('Peso (kg)', { exact: true })).toHaveValue('');
  await attendanceSection(page, 'Condição Clínica'); await expect(field(page, 'Forma clínica')).toHaveCount(0);
  await attendanceSection(page, 'Notificação'); await expect(page.getByRole('button', { name: 'Adicionar notificação', exact: true })).toHaveCount(0);
  expect(await counts(patient.pacienteId)).toEqual({ atendimentos: 1, avcs: 1, dispositivos: 1, obitos: 1, projetos: 1, bzn: 1, notificacoes: 1 });
  await page.getByRole('button', { name: 'Cancelar atendimento', exact: true }).click();
  await page.getByRole('navigation', { name: 'Seções da ficha', exact: true }).getByRole('link', { name: 'Atendimentos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Histórico de atendimentos', exact: true })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Atendimentos desta página', exact: true })).toContainText('Fluxo integral exclusivamente sintético');
  info.annotations.push({ type: 'Confirmação coordenada sintética', description: JSON.stringify({ pacienteId: patient.pacienteId, operacaoId: writes[0], ...receipt }) });
});

test('P0 fluxo único: resposta perdida e repetição de clique recuperam todos os recibos sem duplicar', async ({ page }) => {
  const patient = await seedPatient('Fluxo único recuperação'); const path = `${patient.path}/atendimentos/confirmacao`;
  await signIn(page, 'edicao', `${patient.path}/atendimentos/novo`);
  await page.getByLabel('Data do atendimento', { exact: true }).fill('2026-04-13');
  await attendanceSection(page, 'Chagas e Sorologia'); await add(page, 'sorologia'); await field(page, 'Método sorológico').fill('Recuperação sintética');
  await attendanceSection(page, 'Eventos e Dispositivos'); await add(page, 'AVC'); await field(page, 'Ocorreu AVC').selectOption('nao');
  await reviewAttendance(page);
  let operationId = '';
  page.on('request', request => { if (request.method() === 'POST' && new URL(request.url()).pathname === `/v1${path}`) operationId = request.headers()['x-operacao-id']!; });
  const lost = await loseResponseAfterCommit(page, 'POST', path);
  const confirm = page.getByRole('button', { name: 'Confirmar atendimento', exact: true });
  // Two DOM click events in one turn also exercise the synchronous sending guard.
  await confirm.evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
  const committed = await lost.committed; expect(committed.status()).toBe(201);
  const receipt = await committed.json() as Receipt;
  await expect(page.getByRole('alert')).toContainText(/não foi possível confirmar/i); await expect(confirm).toBeDisabled();
  expect(await counts(patient.pacienteId)).toMatchObject({ atendimentos: 1, avcs: 1 });
  await page.getByRole('button', { name: 'Verificar resultado do envio', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Confirmação concluída', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Consultar atendimento confirmado', exact: true })).toHaveAttribute('href', `${patient.path}/atendimentos/${receipt.atendimentoId}`);
  expect(lost.writes()).toBe(1);
  expect(await apiJson('GET', `/operacoes/${operationId}`, undefined, 'edicao')).toMatchObject({ estado: 'confirmada', resultado: receipt });
  expect(await apiJson('GET', `${patient.path}/atendimentos/${receipt.atendimentoId}/sorologias`)).toHaveLength(1);
  expect(await counts(patient.pacienteId)).toMatchObject({ atendimentos: 1, avcs: 1 });
});

test('P0 fluxo único: falha tardia reverte a unidade inteira e recibo impede replay', async () => {
  const patient = await seedPatient('Fluxo único rollback'); const path = `${patient.path}/atendimentos/confirmacao`;
  const before = await counts(patient.pacienteId);
  const body = { dataAtendimento: '2026-04-14', dadosClinicos: { pesoKg: 70.25 },
    sorologias: [{ metodoSorologico: 'Não deve persistir' }], condicaoChagas: { possuiSintomas: false },
    avcs: [{ ocorreu: true, anoEvento: 2001 }], projetos: [{ projetoId: '9223372036854775806', participa: true }] };
  const rejected = await correlated('edicao', path, body);
  expect(rejected.response.status).toBe(400);
  expect(await counts(patient.pacienteId)).toEqual(before);
  expect(await apiJson('GET', `/operacoes/${rejected.operationId}`, undefined, 'edicao')).toMatchObject({ estado: 'nao_aplicada' });
  expect((await rejected.send()).status).toBe(409);
  expect(await counts(patient.pacienteId)).toEqual(before);
  const accepted = await correlated('edicao', path, { dataAtendimento: '2026-04-14', condicaoChagas: { possuiSintomas: false } });
  expect(accepted.response.status).toBe(201); const receipt = await accepted.response.json() as Receipt;
  expect((await accepted.send()).status).toBe(409);
  expect(await apiJson('GET', `/operacoes/${accepted.operationId}`, undefined, 'edicao')).toMatchObject({ estado: 'confirmada', resultado: receipt });
  expect(await counts(patient.pacienteId)).toMatchObject({ atendimentos: 1, avcs: 0, projetos: 0 });
});

test('P0 fluxo único: histórico longitudinal existente é consultado sem duplicação ou sobrescrita', async ({ page }) => {
  const patient = await seedPatient('Fluxo único histórico');
  const [project] = await apiJson<CatalogRow[]>('GET', '/catalogos/projetos?limit=100');
  const seeded = await correlated('edicao', `${patient.path}/atendimentos/confirmacao`, { dataAtendimento: '2026-04-15',
    avcs: [{ ocorreu: true, anoEvento: 2003 }], dispositivos: [{ tipoDispositivo: 'marcapasso', possuiDispositivo: true }],
    obito: { houveObito: false }, tratamentoBzn: { iniciado: false }, notificacao: { pacienteNotificado: true, numeroNotificacao: 'SINTETICO' },
    projetos: [{ projetoId: project!.id, participa: true }] });
  expect(seeded.response.status).toBe(201);
  const before = await counts(patient.pacienteId);
  const history = () => Promise.all(['avcs', 'dispositivos', 'obito', 'projetos', 'tratamento-bzn', 'notificacao']
    .map(resource => apiJson('GET', `${patient.path}/${resource}`)));
  const originalHistory = await history();
  await signIn(page, 'edicao', `${patient.path}/atendimentos/novo`);
  for (const section of ['Eventos e Dispositivos', 'Projetos', 'Medicamentos e BZN', 'Notificação']) await attendanceSection(page, section);
  await attendanceSection(page, 'Atendimento'); await page.getByLabel('Data do atendimento', { exact: true }).fill('2026-04-16');
  await attendanceSection(page, 'Condição Clínica'); await add(page, 'condição de Chagas'); await field(page, 'Possui sintomas').selectOption('nao');
  await reviewAttendance(page);
  const saved = await submitWrite(page, 'POST', `${patient.path}/atendimentos/confirmacao`, 'Confirmar atendimento');
  expect(saved.body).not.toHaveProperty('avcs'); expect(saved.body).not.toHaveProperty('projetos');
  expect(saved.body).not.toHaveProperty('tratamentoBzn'); expect(saved.body).not.toHaveProperty('notificacao');
  expect(await counts(patient.pacienteId)).toEqual({ ...before, atendimentos: before.atendimentos! + 1 });
  const conflict = await correlated('edicao', `${patient.path}/atendimentos/confirmacao`, { dataAtendimento: '2026-04-17', notificacao: { pacienteNotificado: false } });
  expect(conflict.response.status).toBe(409); expect(await counts(patient.pacienteId)).toEqual({ ...before, atendimentos: before.atendimentos! + 1 });
  expect(await apiJson('GET', `${patient.path}/notificacao`)).toMatchObject({ pacienteNotificado: true, numeroNotificacao: 'SINTETICO' });
  expect(await history()).toEqual(originalHistory);
});

test('P0 fluxo único: confirmações concorrentes do mesmo AVC preservam uma unidade e seus recibos', async () => {
  const patient = await seedPatient('Fluxo único concorrente');
  let ready = 0;
  let release!: () => void;
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const beforeSend = async () => { if (++ready === 2) release(); await barrier; };
  const body = { dataAtendimento: '2026-04-18', avcs: [{ ocorreu: true, anoEvento: 2011 }] };
  const attempts = await Promise.all([0, 1].map(() => correlated('edicao',
    `${patient.path}/atendimentos/confirmacao`, body, randomUUID(), beforeSend)));
  expect(attempts.map(attempt => attempt.response.status).sort()).toEqual([201, 409]);
  for (const attempt of attempts) {
    const operation = await apiJson<{ estado: string; resultado?: Receipt }>('GET', `/operacoes/${attempt.operationId}`, undefined, 'edicao');
    if (attempt.response.status === 201) expect(operation).toMatchObject({ estado: 'confirmada', resultado: await attempt.response.json() });
    else expect(operation).toMatchObject({ estado: 'nao_aplicada' });
  }
  expect(await counts(patient.pacienteId)).toMatchObject({ atendimentos: 1, avcs: 1 });
});

test('P0 fluxo único: consulta e falta de vínculo impedem escrita; inválidos retornam campos específicos', async ({ page }) => {
  const patient = await seedPatient('Fluxo único restrições'); const path = `${patient.path}/atendimentos/confirmacao`;
  await signIn(page, 'consulta', `${patient.path}/atendimentos/novo`);
  await expect(page.getByRole('heading', { name: 'Acesso de consulta', exact: true })).toBeVisible();
  expect((await apiAs('consulta', 'POST', path, { dataAtendimento: '2026-04-18' })).status).toBe(403);
  expect((await apiAs('edicao', 'POST', path, { dataAtendimento: '2026-04-18' })).status).toBe(400);
  const invalid = await correlated('edicao', path, { dataAtendimento: '2026-04-18', condicaoChagas: { formaClinica: 'inventada' }, avcs: [{ anoEvento: 10000 }] });
  expect(invalid.response.status).toBe(400);
  const invalidBody = await invalid.response.json();
  expect(invalidBody).toMatchObject({ errors: expect.arrayContaining([{ path: 'condicaoChagas.formaClinica', code: 'option' }, { path: 'avcs.0.anoEvento', code: 'invalid' }]) });
  expect(JSON.stringify(invalidBody)).not.toMatch(/INSERT|SELECT|constraint|stack/);
  const revoked = await correlated('edicao', path, { dataAtendimento: '2026-04-18', condicaoChagas: { possuiSintomas: false } }, randomUUID(),
    async () => { await apiJson('PUT', `${patient.path}/acesso/${fixture.users.edicao.usuarioId}`, { ativo: false, podeEditar: false }); });
  expect(revoked.response.status).toBe(403);
  expect((await counts(patient.pacienteId)).atendimentos).toBe(0);
});
