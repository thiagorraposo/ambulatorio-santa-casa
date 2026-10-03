import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';

const suite = process.env.TEST_CLINICAL_DB && process.env.REVISION_STAGING_HTTP_ENABLED === 'true' ? describe : describe.skip;
suite('Recebimento e aprovação de XLSX revisado em banco descartável', () => {
  let app: INestApplication; let owner: Pool; let token: string; let actor: string;
  let previousNodeEnv: string | undefined;
  let patient: string; let attendance: string; let event: string; let field: string;
  let dateField: string; let observationField: string;
  let source: string; let authorization: string; let baseLot: string; let baseLine: string;
  let fixture: string; let directory: string; let physical: { aba: string; ordem: number; bruto: unknown[] };
  const profileTokens: Record<string, string> = {};
  const manifestText = readFileSync(resolve(process.cwd(), '../manifestos/planilha_ambulatorio_v1.json'), 'utf8');
  const manifest = JSON.parse(manifestText) as { versao: string; layout_versao: string };
  const transformText = JSON.stringify({ formato: 'revisao-transformacoes/v1', regras: [
    { chave: 'data_do_atendimento', bloco: 'geral', ocorrencia: 1,
      tabela: 'atendimento', coluna: 'data_atendimento', transformacao: 'data_dd_mm_aaaa' },
    { chave: 'observacao', bloco: 'geral', ocorrencia: 1,
      tabela: 'atendimento', coluna: 'observacoes', transformacao: 'texto' },
    { chave: 'retorno_anual_realizado', bloco: 'geral', ocorrencia: 1,
      tabela: 'evento_clinico', coluna: 'ano_evento', transformacao: 'ano' }] });
  const sha = (bytes: string) => createHash('sha256').update(bytes).digest('hex');
  const http = () => request(app.getHttpServer());
  const envelope = (value: number) => ({ estado: 'valor', valor: value, tipo_sql: 'integer',
    precisao: 'ano', serializacao_versao: 'v1' });
  const dateEnvelope = (value: string) => ({ estado: 'valor', valor: value, tipo_sql: 'date',
    precisao: 'data_completa', serializacao_versao: 'v1' });
  const textEnvelope = (value: string) => ({ estado: 'valor', valor: value, tipo_sql: 'text',
    precisao: 'nao_temporal', serializacao_versao: 'v1' });
  const fields = () => [
    { campoId: dateField, registroId: attendance, alvoChave: 'atendimento',
      chaveSemantica: 'data_do_atendimento', blocoFuncional: 'geral', ocorrencia: 1,
      categoria: 'correcao_ocorrencia', operacao: 'definir',
      base: dateEnvelope('2026-01-01'), proposto: dateEnvelope('2026-01-02') },
    { campoId: observationField, registroId: attendance, alvoChave: 'atendimento',
      chaveSemantica: 'observacao', blocoFuncional: 'geral', ocorrencia: 1,
      categoria: 'correcao_ocorrencia', operacao: 'definir',
      base: textEnvelope('Observacao base sintetica'), proposto: textEnvelope('Observacao revisada sintetica') },
    { campoId: field, registroId: event, alvoChave: 'fato_anual',
      chaveSemantica: 'retorno_anual_realizado', blocoFuncional: 'geral', ocorrencia: 1,
      categoria: 'atualizacao_consolidada', operacao: 'definir', base: envelope(2023), proposto: envelope(2022) },
  ];
  const proposal = () => ({ linhas: [
    { abaNomeOriginal: physical.aba, abaOrdem: physical.ordem, numeroLinha: 2,
      linhaBaseId: baseLine, pacienteId: patient, atendimentoBaseId: attendance, resultado: 'autorizar', campos: fields() },
    { abaNomeOriginal: physical.aba, abaOrdem: physical.ordem, numeroLinha: 3,
      linhaBaseId: null, pacienteId: null, atendimentoBaseId: null, resultado: 'bloquear', campos: [] }] });
  const receive = (proposta = proposal(), auth = authorization, text = manifestText) =>
    http().post('/importacoes/revisoes/arquivos/receber').auth(token, { type: 'bearer' })
      .field('fonteId', source).field('loteBaseId', baseLot).field('autorizacaoId', auth)
      .field('manifestoRevisado', text).field('transformacoes', transformText)
      .field('proposta', JSON.stringify(proposta)).attach('arquivo', fixture);
  const clinicalState = async () => (await owner.query(`SELECT
    (SELECT count(*) FROM ambulatorio.paciente) pacientes,
    (SELECT count(*) FROM ambulatorio.atendimento) atendimentos,
    (SELECT count(*) FROM ambulatorio.evento_clinico) eventos,
    (SELECT count(*) FROM ambulatorio.auditoria_campo_evento) historico,
    (SELECT count(*) FROM ambulatorio.importacao_registro) proveniencia,
    (SELECT count(*) FROM ambulatorio.importacao_revisao_aplicacao) aplicacoes`)).rows[0];
  const targetState = async () => (await owner.query(`SELECT a.data_atendimento::text AS data,
    a.observacoes, e.ano_evento AS ano FROM ambulatorio.atendimento a
    JOIN ambulatorio.evento_clinico e ON e.evento_clinico_id=$2 WHERE a.atendimento_id=$1`,
  [attendance,event])).rows[0];

  beforeAll(async () => {
    previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    if (!/^etapa5_clinical_\d+_\d+$/.test(process.env.TEST_CLINICAL_DB!)) throw new Error('Banco descartável obrigatório');
    directory = mkdtempSync(join(tmpdir(), 'ambulatorio-staging-http-')); fixture = join(directory, 'revisada.xlsx');
    physical = JSON.parse(execFileSync('python3', [resolve(process.cwd(), '../tests/backend/gerar_planilha_revisao_http.py'), fixture],
      { encoding: 'utf8' }));
    owner = new Pool({ host: process.env.TEST_OWNER_HOST, port: Number(process.env.TEST_OWNER_PORT),
      user: process.env.TEST_OWNER_USER, password: process.env.TEST_OWNER_PASSWORD, database: process.env.TEST_CLINICAL_DB });
    const seed = await owner.connect();
    try {
      await seed.query('BEGIN');
      actor = (await seed.query(`INSERT INTO ambulatorio.usuario_aplicacao(nome,login,senha_hash,perfil)
        VALUES('Gestor anual HTTP sintético','stage-' || txid_current() || '@example.invalid',
          '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','administracao') RETURNING usuario_id::text`)).rows[0].usuario_id;
      await seed.query('INSERT INTO ambulatorio.importacao_revisao_gestor(usuario_id) VALUES($1)', [actor]);
      field = (await seed.query(`SELECT campo_id::text FROM ambulatorio.auditoria_campo
        WHERE tabela_destino='evento_clinico' AND coluna_destino='ano_evento' AND captura_desde IS NOT NULL`)).rows[0].campo_id;
      dateField = (await seed.query(`SELECT campo_id::text FROM ambulatorio.auditoria_campo
        WHERE tabela_destino='atendimento' AND coluna_destino='data_atendimento' AND captura_desde IS NOT NULL`)).rows[0].campo_id;
      observationField = (await seed.query(`SELECT campo_id::text FROM ambulatorio.auditoria_campo
        WHERE tabela_destino='atendimento' AND coluna_destino='observacoes' AND captura_desde IS NOT NULL`)).rows[0].campo_id;
      patient = (await seed.query("INSERT INTO ambulatorio.paciente(nome) VALUES('Paciente anual revisão HTTP sintético') RETURNING paciente_id::text")).rows[0].paciente_id;
      // Cadastro exclusivo do mantenedor de artefatos, fora das rotas do revisor.
      await seed.query(`INSERT INTO ambulatorio.revisao_artefato(sha256,tipo,versao,conteudo)
        VALUES($1,'manifesto',$2,$3),($4,'transformacoes','stage-http-v1',$5) ON CONFLICT(sha256) DO NOTHING`,
      [sha(manifestText), manifest.versao, manifestText, sha(transformText), transformText]);
      baseLot = (await seed.query(`INSERT INTO ambulatorio.importacao_lote
        (codigo_lote,hash_arquivo_sha256,layout_versao,status_lote,manifesto_sha256,importador_versao,revisao_git)
        VALUES('stage-base-' || txid_current(),repeat('c',64),$1,'processando',$2,'1.7.0','abcdef0') RETURNING importacao_lote_id::text`,
      [manifest.layout_versao,sha(manifestText)])).rows[0].importacao_lote_id;
      baseLine = (await seed.query(`INSERT INTO ambulatorio.importacao_linha(importacao_lote_id,aba_nome_original,
        aba_ordem,numero_linha,dados_brutos,status_linha) VALUES($1,$2,$3,2,$4::jsonb,'processando') RETURNING importacao_linha_id::text`,
      [baseLot,physical.aba,physical.ordem,JSON.stringify(physical.bruto)])).rows[0].importacao_linha_id;
      await seed.query('SET LOCAL ROLE ambulatorio_importador');
      await seed.query('SELECT ambulatorio.auditoria_iniciar_importacao($1)', [baseLine]);
      attendance = (await seed.query(`INSERT INTO ambulatorio.atendimento(paciente_id,data_atendimento,observacoes)
        VALUES($1,'2026-01-01','Observacao base sintetica') RETURNING atendimento_id::text`, [patient])).rows[0].atendimento_id;
      event = (await seed.query(`INSERT INTO ambulatorio.evento_clinico(paciente_id,tipo_evento,ano_evento)
        VALUES($1,'ultimo_comparecimento_ano_informado',2023) RETURNING evento_clinico_id::text`, [patient])).rows[0].evento_clinico_id;
      await seed.query(`INSERT INTO ambulatorio.importacao_registro(importacao_linha_id,tabela_destino,registro_id,acao)
        VALUES($1,'paciente',$2,'criado'),($1,'atendimento',$3,'criado'),($1,'evento_clinico',$4,'criado')`,
      [baseLine,patient,attendance,event]);
      await seed.query('RESET ROLE');
      await seed.query(`INSERT INTO ambulatorio.acompanhamento_cuidado(atendimento_id,data_realizada,retorno_programado,
        compareceu,status_acompanhamento,tipo_acompanhamento,resumo_acompanhamento)
        VALUES($1,'2026-02-01',false,true,'concluido','retorno_bzn_30_dias','Retorno BZN sintetico')`, [attendance]);
      await seed.query("UPDATE ambulatorio.importacao_linha SET status_linha='importada' WHERE importacao_linha_id=$1", [baseLine]);
      await seed.query("UPDATE ambulatorio.importacao_lote SET status_lote='concluido' WHERE importacao_lote_id=$1", [baseLot]);
      await seed.query('COMMIT');
    } catch (error) { await seed.query('ROLLBACK'); throw error; } finally { seed.release(); }
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication(); configureApp(app); await app.init();
    token = await app.get(JwtService).signAsync({ sub: actor, typ: 'access' });
    for (const profile of ['consulta','edicao']) {
      const id = (await owner.query(`INSERT INTO ambulatorio.usuario_aplicacao(nome,login,senha_hash,perfil)
        VALUES($1,$2 || txid_current() || '@example.invalid',
          '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK',$3) RETURNING usuario_id::text`,
      [`Perfil ${profile} de revisão sintético`, `stage-${profile}-`,profile])).rows[0].usuario_id;
      profileTokens[profile] = await app.get(JwtService).signAsync({ sub: id, typ: 'access' });
    }
    source = (await http().post('/importacoes/revisoes/fontes').auth(token, { type: 'bearer' })
      .send({ codigoFonte: `stage-http-${Date.now()}`, loteInicialId: baseLot }).expect(201)).body.fonteId;
    authorization = (await http().post('/importacoes/revisoes/autorizacoes').auth(token, { type: 'bearer' })
      .send({ fonteId: source, usuarioId: actor }).expect(201)).body.autorizacaoId;
  });
  afterAll(async () => {
    try { await app?.close(); }
    finally {
      try { await owner?.end(); }
      finally {
        if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previousNodeEnv;
        if (directory) rmSync(directory, { recursive: true, force: true });
      }
    }
  });

  it('recusa arquivo incompleto, artefato não cadastrado e autorização ausente sem persistência', async () => {
    expect(process.env.NODE_ENV).toBe('development');
    expect(process.env.REVISION_SYNTHETIC_MODE).toBe('true');
    const before = await clinicalState();
    for (const profile of ['consulta','edicao']) await http().post('/importacoes/revisoes/arquivos/receber')
      .auth(profileTokens[profile], { type: 'bearer' }).expect(403);
    const incomplete = proposal(); incomplete.linhas.pop();
    await receive(incomplete).expect(400);
    const otherManifest = JSON.stringify({ ...JSON.parse(manifestText), versao: 'artefato-nao-aprovado' });
    await receive(proposal(), authorization, otherManifest).expect(409);
    await receive(proposal(), '9223372036854775807').expect(403);
    expect(await clinicalState()).toEqual(before);
    expect((await owner.query('SELECT count(*)::int n FROM ambulatorio.importacao_revisao_recebimento')).rows[0].n).toBe(0);
  });

  it('aplica revisão anual-only sem criar visita, preserva precisão e replay idempotente', async () => {
    const annualFixture = join(directory, 'revisada-anual-only.xlsx');
    const annualPhysical = JSON.parse(execFileSync('python3', [resolve(process.cwd(), '../tests/backend/gerar_planilha_revisao_http.py'), annualFixture, 'anual-apenas'],
      { encoding: 'utf8' })) as { aba: string; ordem: number; bruto: unknown[] };
    const seed = await owner.connect();
    let annualPatient: string; let annualAttendance: string; let annualEvent: string;
    let annualBaseLot: string; let annualBaseLine: string;
    try {
      await seed.query('BEGIN');
      annualPatient = (await seed.query("INSERT INTO ambulatorio.paciente(nome) VALUES('Paciente T08 anual-only sintético') RETURNING paciente_id::text")).rows[0].paciente_id;
      annualBaseLot = (await seed.query(`INSERT INTO ambulatorio.importacao_lote
        (codigo_lote,hash_arquivo_sha256,layout_versao,status_lote,manifesto_sha256,importador_versao,revisao_git)
        VALUES('t08-base-' || txid_current(),$1,$2,'processando',$3,'1.7.0','abcdef0') RETURNING importacao_lote_id::text`,
      [sha('T08 lote base sintético'),manifest.layout_versao,sha(manifestText)])).rows[0].importacao_lote_id;
      annualBaseLine = (await seed.query(`INSERT INTO ambulatorio.importacao_linha(importacao_lote_id,aba_nome_original,
        aba_ordem,numero_linha,dados_brutos,status_linha) VALUES($1,$2,$3,2,$4::jsonb,'processando') RETURNING importacao_linha_id::text`,
      [annualBaseLot,annualPhysical.aba,annualPhysical.ordem,JSON.stringify(annualPhysical.bruto)])).rows[0].importacao_linha_id;
      await seed.query('SET LOCAL ROLE ambulatorio_importador');
      await seed.query('SELECT ambulatorio.auditoria_iniciar_importacao($1)', [annualBaseLine]);
      annualAttendance = (await seed.query(`INSERT INTO ambulatorio.atendimento(paciente_id,data_atendimento,observacoes)
        VALUES($1,'2026-01-01','Observacao base sintetica') RETURNING atendimento_id::text`, [annualPatient])).rows[0].atendimento_id;
      annualEvent = (await seed.query(`INSERT INTO ambulatorio.evento_clinico(paciente_id,tipo_evento,ano_evento)
        VALUES($1,'ultimo_comparecimento_ano_informado',2023) RETURNING evento_clinico_id::text`, [annualPatient])).rows[0].evento_clinico_id;
      await seed.query(`INSERT INTO ambulatorio.importacao_registro(importacao_linha_id,tabela_destino,registro_id,acao)
        VALUES($1,'paciente',$2,'criado'),($1,'atendimento',$3,'criado'),($1,'evento_clinico',$4,'criado')`,
      [annualBaseLine,annualPatient,annualAttendance,annualEvent]);
      await seed.query('RESET ROLE');
      await seed.query(`INSERT INTO ambulatorio.acompanhamento_cuidado(atendimento_id,data_realizada,retorno_programado,
        compareceu,status_acompanhamento,tipo_acompanhamento,resumo_acompanhamento)
        VALUES($1,'2026-02-01',false,true,'concluido','retorno_bzn_30_dias','Retorno BZN T08 sintético')`, [annualAttendance]);
      await seed.query("UPDATE ambulatorio.importacao_linha SET status_linha='importada' WHERE importacao_linha_id=$1", [annualBaseLine]);
      await seed.query("UPDATE ambulatorio.importacao_lote SET status_lote='concluido' WHERE importacao_lote_id=$1", [annualBaseLot]);
      await seed.query('COMMIT');
    } catch (error) { await seed.query('ROLLBACK'); throw error; } finally { seed.release(); }

    const annualSource = (await http().post('/importacoes/revisoes/fontes').auth(token, { type: 'bearer' })
      .send({ codigoFonte: `stage-t08-${Date.now()}`, loteInicialId: annualBaseLot }).expect(201)).body.fonteId as string;
    const annualAuthorization = (await http().post('/importacoes/revisoes/autorizacoes').auth(token, { type: 'bearer' })
      .send({ fonteId: annualSource, usuarioId: actor }).expect(201)).body.autorizacaoId as string;
    const annualProposal = { linhas: [
      { abaNomeOriginal: annualPhysical.aba, abaOrdem: annualPhysical.ordem, numeroLinha: 2,
        linhaBaseId: annualBaseLine, pacienteId: annualPatient, atendimentoBaseId: annualAttendance,
        resultado: 'autorizar', campos: [{ campoId: field, registroId: annualEvent, alvoChave: 'fato_anual',
          chaveSemantica: 'retorno_anual_realizado', blocoFuncional: 'geral', ocorrencia: 1,
          categoria: 'atualizacao_consolidada', operacao: 'definir', base: envelope(2023), proposto: envelope(2025) }] },
      { abaNomeOriginal: annualPhysical.aba, abaOrdem: annualPhysical.ordem, numeroLinha: 3,
        linhaBaseId: null, pacienteId: null, atendimentoBaseId: null, resultado: 'bloquear', campos: [] },
    ] };
    const annualReceived = await http().post('/importacoes/revisoes/arquivos/receber').auth(token, { type: 'bearer' })
      .field('fonteId', annualSource).field('loteBaseId', annualBaseLot).field('autorizacaoId', annualAuthorization)
      .field('manifestoRevisado', manifestText).field('transformacoes', transformText)
      .field('proposta', JSON.stringify(annualProposal)).attach('arquivo', annualFixture).expect(201);
    const annualLine = annualReceived.body.linhas[0].linhaId as string;
    const approved = await http().post('/importacoes/revisoes/decisoes/publicar').auth(token, { type: 'bearer' })
      .send({ revisaoId: annualReceived.body.revisaoId, linhaRevisadaId: annualLine, linhaBaseId: annualBaseLine,
        pacienteId: annualPatient, atendimentoBaseId: annualAttendance, autorizacaoId: annualAuthorization,
        resultado: 'autorizar', justificativa: 'Somente o fato consolidado anual mudou',
        campos: annualProposal.linhas[0].campos, decisaoAnteriorId: null }).expect(201);
    const before = await owner.query(`SELECT
      (SELECT count(*)::int FROM ambulatorio.atendimento WHERE paciente_id=$1) atendimentos,
      (SELECT count(*)::int FROM ambulatorio.evento_clinico WHERE paciente_id=$1) eventos,
      (SELECT count(*)::int FROM ambulatorio.acompanhamento_cuidado c JOIN ambulatorio.atendimento a USING(atendimento_id)
       WHERE a.paciente_id=$1 AND c.tipo_acompanhamento LIKE 'retorno_bzn_%') retornos,
      (SELECT array_agg(atendimento_id::text ORDER BY atendimento_id) FROM ambulatorio.atendimento WHERE paciente_id=$1) ids,
      (SELECT array_agg(data_atendimento::text ORDER BY atendimento_id) FROM ambulatorio.atendimento WHERE paciente_id=$1) datas`, [annualPatient]);
    const dryRun = await http().post('/importacoes/revisoes/decisoes/simular').auth(token, { type: 'bearer' })
      .send({ decisaoId: approved.body.decisaoId, autorizacaoId: annualAuthorization }).expect(201);
    expect(dryRun.body.resultado).toBe('apta');
    expect((await owner.query('SELECT ano_evento FROM ambulatorio.evento_clinico WHERE evento_clinico_id=$1', [annualEvent])).rows[0].ano_evento).toBe(2023);
    const raw = (await owner.query('SELECT dados_brutos FROM ambulatorio.importacao_linha WHERE importacao_linha_id=$1', [annualLine])).rows[0].dados_brutos as { chave: string; valor: string }[];
    expect(raw.find(cell => cell.chave === 'retorno_anual_realizado')?.valor).toBe('2025');

    const apply = () => http().post('/importacoes/revisoes/decisoes/aplicar').auth(token, { type: 'bearer' })
      .send({ decisaoId: approved.body.decisaoId, autorizacaoId: annualAuthorization });
    const applied = await apply().expect(201);
    expect(applied.body.resultado).toBe('aplicada');
    expect((await owner.query('SELECT ano_evento FROM ambulatorio.evento_clinico WHERE evento_clinico_id=$1', [annualEvent])).rows[0].ano_evento).toBe(2025);
    expect((await owner.query(`SELECT count(*)::int n FROM ambulatorio.importacao_revisao_campo
      WHERE decisao_id=$1 AND campo_id=$2 AND registro_id=$3 AND proposto->>'valor'='2025'
        AND proposto->>'precisao'='ano'`, [approved.body.decisaoId,field,annualEvent])).rows[0].n).toBe(1);
    expect((await owner.query(`SELECT count(*)::int n FROM ambulatorio.auditoria_campo_evento e
      JOIN ambulatorio.importacao_revisao_alvo a USING(revisao_alvo_id)
      JOIN ambulatorio.importacao_revisao_campo c USING(revisao_campo_id)
      WHERE c.decisao_id=$1 AND c.campo_id=$2 AND c.registro_id=$3 AND e.origem='revisao'
        AND e.depois->>'valor'='2025'`, [approved.body.decisaoId,field,annualEvent])).rows[0].n).toBe(1);
    expect((await owner.query(`SELECT count(*)::int n FROM ambulatorio.importacao_registro
      WHERE importacao_linha_id=$1 AND tabela_destino='evento_clinico' AND registro_id=$2`, [annualLine,annualEvent])).rows[0].n).toBe(1);
    expect((await owner.query(`SELECT count(*)::int n FROM ambulatorio.importacao_registro
      WHERE importacao_linha_id=$1 AND tabela_destino='atendimento' AND registro_id=$2 AND acao='associado'`,
    [annualLine,annualAttendance])).rows[0].n).toBe(1);
    expect((await owner.query(`SELECT count(*)::int n FROM ambulatorio.importacao_registro
      WHERE importacao_linha_id=$1 AND tabela_destino='atendimento' AND registro_id<>$2`,
    [annualLine,annualAttendance])).rows[0].n).toBe(0);
    const after = await owner.query(`SELECT
      (SELECT count(*)::int FROM ambulatorio.atendimento WHERE paciente_id=$1) atendimentos,
      (SELECT count(*)::int FROM ambulatorio.evento_clinico WHERE paciente_id=$1) eventos,
      (SELECT count(*)::int FROM ambulatorio.acompanhamento_cuidado c JOIN ambulatorio.atendimento a USING(atendimento_id)
       WHERE a.paciente_id=$1 AND c.tipo_acompanhamento LIKE 'retorno_bzn_%') retornos,
      (SELECT array_agg(atendimento_id::text ORDER BY atendimento_id) FROM ambulatorio.atendimento WHERE paciente_id=$1) ids,
      (SELECT array_agg(data_atendimento::text ORDER BY atendimento_id) FROM ambulatorio.atendimento WHERE paciente_id=$1) datas`, [annualPatient]);
    expect(after.rows).toEqual(before.rows);
    const historyCount = (await owner.query('SELECT count(*)::int n FROM ambulatorio.auditoria_campo_evento WHERE campo_id=$1 AND registro_id=$2', [field,annualEvent])).rows[0].n;
    const replay = await apply().expect(201);
    expect(replay.body.resultado).toBe('ja_aplicada');
    expect((await owner.query('SELECT ano_evento FROM ambulatorio.evento_clinico WHERE evento_clinico_id=$1', [annualEvent])).rows[0].ano_evento).toBe(2025);
    expect((await owner.query('SELECT count(*)::int n FROM ambulatorio.auditoria_campo_evento WHERE campo_id=$1 AND registro_id=$2', [field,annualEvent])).rows[0].n).toBe(historyCount);
  });

  it('recebe e aplica nova visita da aba sem observação, com NULL auditável e efeito único', async () => {
    const newVisitFixture = join(directory, 'revisada-visita-nova-aba2.xlsx');
    const newVisitPhysical = JSON.parse(execFileSync('python3', [resolve(process.cwd(), '../tests/backend/gerar_planilha_revisao_http.py'), newVisitFixture, 'visita-nova'],
      { encoding: 'utf8' })) as { aba: string; ordem: number; bruto: unknown[]; brutoBase: unknown[] };
    const seed = await owner.connect();
    let existingPatient: string; let existingAttendance: string;
    let baseLotForVisit: string; let baseLineForVisit: string;
    try {
      await seed.query('BEGIN');
      existingPatient = (await seed.query("INSERT INTO ambulatorio.paciente(nome) VALUES('Paciente T06 visita nova HTTP sintético') RETURNING paciente_id::text")).rows[0].paciente_id;
      baseLotForVisit = (await seed.query(`INSERT INTO ambulatorio.importacao_lote
        (codigo_lote,hash_arquivo_sha256,layout_versao,status_lote,manifesto_sha256,importador_versao,revisao_git)
        VALUES('t06-base-' || txid_current(),$1,$2,'processando',$3,'1.7.0','abcdef0') RETURNING importacao_lote_id::text`,
      [sha('T06 lote base sintético'),manifest.layout_versao,sha(manifestText)])).rows[0].importacao_lote_id;
      baseLineForVisit = (await seed.query(`INSERT INTO ambulatorio.importacao_linha(importacao_lote_id,aba_nome_original,
        aba_ordem,numero_linha,dados_brutos,status_linha) VALUES($1,$2,$3,2,$4::jsonb,'processando') RETURNING importacao_linha_id::text`,
      [baseLotForVisit,newVisitPhysical.aba,newVisitPhysical.ordem,JSON.stringify(newVisitPhysical.brutoBase)])).rows[0].importacao_linha_id;
      await seed.query('SET LOCAL ROLE ambulatorio_importador');
      await seed.query('SELECT ambulatorio.auditoria_iniciar_importacao($1)', [baseLineForVisit]);
      existingAttendance = (await seed.query(`INSERT INTO ambulatorio.atendimento(paciente_id,data_atendimento,observacoes)
        VALUES($1,'2026-02-01',NULL) RETURNING atendimento_id::text`, [existingPatient])).rows[0].atendimento_id;
      await seed.query(`INSERT INTO ambulatorio.importacao_registro(importacao_linha_id,tabela_destino,registro_id,acao)
        VALUES($1,'paciente',$2,'criado'),($1,'atendimento',$3,'criado')`,
      [baseLineForVisit,existingPatient,existingAttendance]);
      await seed.query('RESET ROLE');
      await seed.query(`INSERT INTO ambulatorio.acompanhamento_cuidado(atendimento_id,data_realizada,retorno_programado,
        compareceu,status_acompanhamento,tipo_acompanhamento,resumo_acompanhamento)
        VALUES($1,'2026-02-15',false,true,'concluido','retorno_bzn_30_dias','Retorno BZN visita-base sintético')`, [existingAttendance]);
      await seed.query("UPDATE ambulatorio.importacao_linha SET status_linha='importada' WHERE importacao_linha_id=$1", [baseLineForVisit]);
      await seed.query("UPDATE ambulatorio.importacao_lote SET status_lote='concluido' WHERE importacao_lote_id=$1", [baseLotForVisit]);
      await seed.query('COMMIT');
    } catch (error) { await seed.query('ROLLBACK'); throw error; } finally { seed.release(); }

    const sourceForVisit = (await http().post('/importacoes/revisoes/fontes').auth(token, { type: 'bearer' })
      .send({ codigoFonte: `stage-t06-${Date.now()}`, loteInicialId: baseLotForVisit }).expect(201)).body.fonteId as string;
    const authorizationForVisit = (await http().post('/importacoes/revisoes/autorizacoes').auth(token, { type: 'bearer' })
      .send({ fonteId: sourceForVisit, usuarioId: actor }).expect(201)).body.autorizacaoId as string;
    const absentObservation = { estado: 'coluna_ausente', valor: null, tipo_sql: 'text',
      precisao: 'nao_temporal', serializacao_versao: 'v1' };
    const newVisitFields = [
      { campoId: dateField, registroId: null, alvoChave: 'visita-nova', chaveSemantica: 'data_do_atendimento',
        blocoFuncional: 'geral', ocorrencia: 1, categoria: 'nova_visita', operacao: 'criar',
        base: dateEnvelope('2026-02-01'), proposto: dateEnvelope('2026-02-02') },
      { campoId: observationField, registroId: null, alvoChave: 'visita-nova', chaveSemantica: 'observacao',
        blocoFuncional: 'geral', ocorrencia: 1, categoria: 'nova_visita', operacao: 'criar',
        base: absentObservation, proposto: absentObservation },
    ];
    const newVisitProposal = { linhas: [{ abaNomeOriginal: newVisitPhysical.aba, abaOrdem: newVisitPhysical.ordem,
      numeroLinha: 2, linhaBaseId: baseLineForVisit, pacienteId: existingPatient, atendimentoBaseId: null,
      resultado: 'autorizar', campos: newVisitFields }] };
    const received = await http().post('/importacoes/revisoes/arquivos/receber').auth(token, { type: 'bearer' })
      .field('fonteId', sourceForVisit).field('loteBaseId', baseLotForVisit).field('autorizacaoId', authorizationForVisit)
      .field('manifestoRevisado', manifestText).field('transformacoes', transformText)
      .field('proposta', JSON.stringify(newVisitProposal)).attach('arquivo', newVisitFixture);
    expect(received.status).toBe(201);
    const revisedLine = received.body.linhas[0].linhaId as string;
    const decision = await http().post('/importacoes/revisoes/decisoes/publicar').auth(token, { type: 'bearer' })
      .send({ revisaoId: received.body.revisaoId, linhaRevisadaId: revisedLine, linhaBaseId: baseLineForVisit,
        pacienteId: existingPatient, atendimentoBaseId: null, autorizacaoId: authorizationForVisit,
        resultado: 'autorizar', justificativa: 'Novo comparecimento sintético com data completa',
        campos: newVisitFields, decisaoAnteriorId: null }).expect(201);
    const before = await owner.query(`SELECT
      (SELECT count(*)::int FROM ambulatorio.atendimento WHERE paciente_id=$1) atendimentos,
      (SELECT array_agg(atendimento_id::text ORDER BY atendimento_id) FROM ambulatorio.atendimento WHERE paciente_id=$1) ids,
      (SELECT array_agg(data_atendimento::text ORDER BY atendimento_id) FROM ambulatorio.atendimento WHERE paciente_id=$1) datas,
      (SELECT count(*)::int FROM ambulatorio.acompanhamento_cuidado c JOIN ambulatorio.atendimento a USING(atendimento_id)
       WHERE a.paciente_id=$1 AND c.tipo_acompanhamento LIKE 'retorno_bzn_%') retornos`, [existingPatient]);
    const simulation = await http().post('/importacoes/revisoes/decisoes/simular').auth(token, { type: 'bearer' })
      .send({ decisaoId: decision.body.decisaoId, autorizacaoId: authorizationForVisit }).expect(201);
    expect(simulation.body.resultado).toBe('apta');
    expect((await owner.query('SELECT count(*)::int n FROM ambulatorio.atendimento WHERE paciente_id=$1', [existingPatient])).rows[0].n)
      .toBe(before.rows[0].atendimentos);
    const apply = () => http().post('/importacoes/revisoes/decisoes/aplicar').auth(token, { type: 'bearer' })
      .send({ decisaoId: decision.body.decisaoId, autorizacaoId: authorizationForVisit });
    expect((await apply().expect(201)).body.resultado).toBe('aplicada');
    const after = await owner.query(`SELECT
      (SELECT count(*)::int FROM ambulatorio.atendimento WHERE paciente_id=$1) atendimentos,
      (SELECT array_agg(atendimento_id::text ORDER BY atendimento_id) FROM ambulatorio.atendimento WHERE paciente_id=$1) ids,
      (SELECT array_agg(data_atendimento::text ORDER BY atendimento_id) FROM ambulatorio.atendimento WHERE paciente_id=$1) datas,
      (SELECT count(*)::int FROM ambulatorio.acompanhamento_cuidado c JOIN ambulatorio.atendimento a USING(atendimento_id)
       WHERE a.paciente_id=$1 AND c.tipo_acompanhamento LIKE 'retorno_bzn_%') retornos`, [existingPatient]);
    expect(after.rows[0].atendimentos).toBe(before.rows[0].atendimentos + 1);
    expect(after.rows[0].retornos).toBe(before.rows[0].retornos);
    expect(after.rows[0].ids.slice(0, before.rows[0].ids.length)).toEqual(before.rows[0].ids);
    expect(after.rows[0].datas.slice(0, before.rows[0].datas.length)).toEqual(before.rows[0].datas);
    const createdId = (await owner.query(`SELECT atendimento_criado_id::text AS id FROM ambulatorio.importacao_revisao_aplicacao
      WHERE decisao_id=$1 AND resultado='aplicada'`, [decision.body.decisaoId])).rows[0].id;
    expect((await owner.query(`SELECT data_atendimento::text AS data,observacoes FROM ambulatorio.atendimento
      WHERE atendimento_id=$1 AND paciente_id=$2`, [createdId,existingPatient])).rows[0]).toEqual({ data: '2026-02-02', observacoes: null });
    expect((await owner.query(`SELECT count(*)::int n FROM ambulatorio.auditoria_campo_evento e
      JOIN ambulatorio.importacao_revisao_alvo a USING(revisao_alvo_id)
      JOIN ambulatorio.importacao_revisao_campo c USING(revisao_campo_id)
      WHERE c.decisao_id=$1 AND e.origem='revisao' AND e.versao_campo=1
        AND e.antes->>'estado'='alvo_ausente' AND ((c.campo_id=$2 AND e.depois->>'valor'='2026-02-02')
          OR (c.campo_id=$3 AND e.depois->>'estado'='nulo'))`,
    [decision.body.decisaoId,dateField,observationField])).rows[0].n).toBe(2);
    expect((await owner.query(`SELECT count(*)::int n FROM ambulatorio.importacao_registro
      WHERE importacao_linha_id=$1 AND tabela_destino='atendimento' AND registro_id=$2 AND acao='criado'`,
    [revisedLine,createdId])).rows[0].n).toBe(1);
    const countBeforeReplay = (await owner.query('SELECT count(*)::int n FROM ambulatorio.auditoria_campo_evento')).rows[0].n;
    expect((await apply().expect(201)).body.resultado).toBe('ja_aplicada');
    expect((await owner.query('SELECT count(*)::int n FROM ambulatorio.atendimento WHERE paciente_id=$1', [existingPatient])).rows[0].n)
      .toBe(before.rows[0].atendimentos + 1);
    expect((await owner.query('SELECT count(*)::int n FROM ambulatorio.auditoria_campo_evento')).rows[0].n).toBe(countBeforeReplay);
  });

  it('integra recebimento, aprovação, rollback, dois executores e encerramento atribuível', async () => {
    const before = await clinicalState();
    const bznBefore = (await owner.query(`SELECT count(*)::int n FROM ambulatorio.acompanhamento_cuidado
      WHERE atendimento_id=$1 AND tipo_acompanhamento LIKE 'retorno_bzn_%'`, [attendance])).rows[0].n;
    const staged = await Promise.all([receive().expect(201),receive().expect(201)]);
    expect(staged.map(response => response.body.reutilizada).sort()).toEqual([false,true]);
    expect(staged[0].body.revisaoId).toBe(staged[1].body.revisaoId);
    const received = staged.find(response => !response.body.reutilizada)!;
    expect(received.body).toMatchObject({ reutilizada: false, linhas: [
      { abaOrdem: 1, numeroLinha: 2 }, { abaOrdem: 1, numeroLinha: 3 }] });
    const repeated = await receive().expect(201);
    expect(repeated.body).toEqual({ ...received.body, reutilizada: true });
    const state = (await owner.query(`SELECT r.estado,l.status_lote,x.recebido_por_usuario_id::text,
      count(i.importacao_linha_id)::int linhas FROM ambulatorio.importacao_revisao r
      JOIN ambulatorio.importacao_lote l ON l.importacao_lote_id=r.lote_revisado_id
      JOIN ambulatorio.importacao_revisao_recebimento x USING(revisao_id)
      JOIN ambulatorio.importacao_linha i ON i.importacao_lote_id=l.importacao_lote_id
      WHERE r.revisao_id=$1 GROUP BY r.estado,l.status_lote,x.recebido_por_usuario_id`, [received.body.revisaoId])).rows[0];
    expect(state).toEqual({ estado: 'preparada', status_lote: 'pronto', recebido_por_usuario_id: actor, linhas: 2 });
    const approved = await http().post('/importacoes/revisoes/decisoes/publicar').auth(token, { type: 'bearer' })
      .send({ revisaoId: received.body.revisaoId, linhaRevisadaId: received.body.linhas[0].linhaId,
        linhaBaseId: baseLine, pacienteId: patient, atendimentoBaseId: attendance, autorizacaoId: authorization,
        resultado: 'autorizar', justificativa: 'Correção anual sintética comprovada', campos: fields(), decisaoAnteriorId: null }).expect(201);
    await http().post('/importacoes/revisoes/decisoes/publicar').auth(token, { type: 'bearer' })
      .send({ revisaoId: received.body.revisaoId, linhaRevisadaId: received.body.linhas[1].linhaId,
        linhaBaseId: null, pacienteId: null, atendimentoBaseId: null, autorizacaoId: authorization,
        resultado: 'bloquear', justificativa: 'Linha sintética sem identidade', campos: [], decisaoAnteriorId: null }).expect(201);
    const simulation = await http().post('/importacoes/revisoes/decisoes/simular').auth(token, { type: 'bearer' })
      .send({ decisaoId: approved.body.decisaoId, autorizacaoId: authorization }).expect(201);
    expect(simulation.body.resultado).toBe('apta');
    expect(await clinicalState()).toEqual(before);
    const dryRunTarget = await targetState();
    expect(dryRunTarget).toEqual({ data: '2026-01-01', observacoes: 'Observacao base sintetica', ano: 2023 });
    expect(JSON.stringify(received.body)).not.toMatch(/Paciente|dadosBrutos|senha|stack|2023|2022/i);
    // A mudança posterior à publicação invalida o snapshot. Depois de restaurar
    // o estado-base, uma nova decisão encadeada é simulada e aplicada.
    await owner.query(`UPDATE ambulatorio.atendimento SET data_atendimento='2026-01-03',
      observacoes='Observacao concorrente sintetica' WHERE atendimento_id=$1`, [attendance]);
    const stale = await http().post('/importacoes/revisoes/decisoes/simular').auth(token, { type: 'bearer' })
      .send({ decisaoId: approved.body.decisaoId, autorizacaoId: authorization }).expect(201);
    expect(stale.body).toMatchObject({ resultado: 'obsoleta', codigo: 'revisao_alvo_alterado' });
    await owner.query(`UPDATE ambulatorio.atendimento SET data_atendimento='2026-01-01',
      observacoes='Observacao base sintetica' WHERE atendimento_id=$1`, [attendance]);
    const replacement = await http().post('/importacoes/revisoes/decisoes/publicar').auth(token, { type: 'bearer' })
      .send({ revisaoId: received.body.revisaoId, linhaRevisadaId: received.body.linhas[0].linhaId,
        linhaBaseId: baseLine, pacienteId: patient, atendimentoBaseId: attendance, autorizacaoId: authorization,
        resultado: 'autorizar', justificativa: 'Revalidação mista após mudança concorrente sintética',
        campos: fields(), decisaoAnteriorId: approved.body.decisaoId }).expect(201);
    const replacementSimulation = await http().post('/importacoes/revisoes/decisoes/simular').auth(token, { type: 'bearer' })
      .send({ decisaoId: replacement.body.decisaoId, autorizacaoId: authorization }).expect(201);
    expect(replacementSimulation.body.resultado).toBe('apta');
    expect(await targetState()).toEqual(dryRunTarget);
    const beforeFailure = await clinicalState();
    const sourceBeforeFailure = (await owner.query(`SELECT versao_controle::text,
      revisao_corrente_id::text AS revisao_corrente FROM ambulatorio.importacao_fonte WHERE fonte_id=$1`, [source])).rows[0];
    const applyBody = { decisaoId: replacement.body.decisaoId, autorizacaoId: authorization };
    const apply = () => http().post('/importacoes/revisoes/decisoes/aplicar').auth(token, { type: 'bearer' }).send(applyBody);
    await http().post('/importacoes/revisoes/decisoes/aplicar').send(applyBody).expect(401);
    for (const profile of ['consulta','edicao']) await http().post('/importacoes/revisoes/decisoes/aplicar')
      .auth(profileTokens[profile], { type: 'bearer' }).send(applyBody).expect(403);
    await http().post('/importacoes/revisoes/decisoes/aplicar').auth(token, { type: 'bearer' })
      .send({ ...applyBody, autorizacaoId: '9223372036854775807' }).expect(403);
    // Falha após o trigger de captura: todos os efeitos clínicos devem voltar,
    // mas o diagnóstico sanitizado pode persistir na transação posterior.
    await owner.query(`CREATE FUNCTION ambulatorio.etapa5_falha_http() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.evento_clinico_id=${event} AND NEW.ano_evento=2022 THEN
        IF (SELECT data_atendimento FROM ambulatorio.atendimento WHERE atendimento_id=${attendance})<>'2026-01-02'
          OR (SELECT observacoes FROM ambulatorio.atendimento WHERE atendimento_id=${attendance})<>'Observacao revisada sintetica' THEN
          RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ALVO_ATENDIMENTO_NAO_APLICADO_ANTES_DO_FATO'; END IF;
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='SENTINELA_CLINICA_NAO_VAZAR'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER zz_etapa5_falha_http AFTER UPDATE ON ambulatorio.evento_clinico
        FOR EACH ROW EXECUTE FUNCTION ambulatorio.etapa5_falha_http()`);
    try {
      const failure = await apply().expect(409);
      expect(JSON.stringify(failure.body)).not.toMatch(/SENTINELA|Paciente|2022|stack|dadosBrutos/);
      const rolledBack = await clinicalState();
      expect({ ...rolledBack, aplicacoes: beforeFailure.aplicacoes }).toEqual(beforeFailure);
      expect(await targetState()).toEqual(dryRunTarget);
      expect((await owner.query(`SELECT versao_controle::text,
        revisao_corrente_id::text AS revisao_corrente FROM ambulatorio.importacao_fonte WHERE fonte_id=$1`, [source])).rows[0])
        .toEqual(sourceBeforeFailure);
      const diagnostic = (await owner.query(`SELECT resultado,codigo_resultado FROM ambulatorio.importacao_revisao_aplicacao
        WHERE decisao_id=$1`, [replacement.body.decisaoId])).rows;
      expect(diagnostic).toEqual([{ resultado: 'falha_operacional', codigo_resultado: 'revisao_aplicacao_integridade' }]);
      expect((await owner.query(`SELECT count(*)::int n FROM ambulatorio.importacao_revisao_aplicacao
        WHERE decisao_id=$1 AND resultado='aplicada'`, [replacement.body.decisaoId])).rows[0].n).toBe(0);
      expect((await owner.query(`SELECT count(*)::int n FROM ambulatorio.importacao_registro
        WHERE importacao_linha_id=$1`, [received.body.linhas[0].linhaId])).rows[0].n).toBe(0);
    } finally {
      await owner.query('DROP TRIGGER zz_etapa5_falha_http ON ambulatorio.evento_clinico; DROP FUNCTION ambulatorio.etapa5_falha_http()');
    }
    const concurrent = await Promise.all([apply().expect(201), apply().expect(201)]);
    expect(concurrent.map(response => response.body.resultado).sort()).toEqual(['aplicada','ja_aplicada']);
    expect(concurrent[0].body.aplicacaoId).toBe(concurrent[1].body.aplicacaoId);
    expect((await owner.query(`SELECT count(*)::int n FROM ambulatorio.importacao_revisao_aplicacao
      WHERE decisao_id=$1 AND resultado='aplicada'`, [replacement.body.decisaoId])).rows[0].n).toBe(1);
    expect((await owner.query('SELECT ano_evento FROM ambulatorio.evento_clinico WHERE evento_clinico_id=$1', [event])).rows[0].ano_evento).toBe(2022);
    expect(await targetState()).toEqual({ data: '2026-01-02', observacoes: 'Observacao revisada sintetica', ano: 2022 });
    expect((await owner.query(`SELECT count(*)::int n FROM ambulatorio.acompanhamento_cuidado
      WHERE atendimento_id=$1 AND tipo_acompanhamento LIKE 'retorno_bzn_%'`, [attendance])).rows[0].n).toBe(bznBefore);
    expect((await owner.query(`SELECT count(*)::int n FROM ambulatorio.auditoria_campo_evento
      WHERE origem='revisao' AND ((campo_id=$1 AND registro_id=$2) OR (campo_id=$3 AND registro_id=$4)
        OR (campo_id=$5 AND registro_id=$6))`,
    [dateField,attendance,observationField,attendance,field,event])).rows[0].n).toBe(3);
    const revision = received.body.revisaoId;
    await http().post('/importacoes/revisoes/finalizar').auth(token, { type: 'bearer' })
      .send({ revisaoId: revision, autorizacaoId: authorization, acao: 'cancelar' }).expect(409);
    const finished = await http().post('/importacoes/revisoes/finalizar').auth(token, { type: 'bearer' })
      .send({ revisaoId: revision, autorizacaoId: authorization, acao: 'encerrar' }).expect(201);
    expect(finished.body).toEqual({ estado: 'concluida_com_pendencias' });
    await http().post('/importacoes/revisoes/finalizar').auth(token, { type: 'bearer' })
      .send({ revisaoId: revision, autorizacaoId: authorization, acao: 'encerrar' }).expect(201, finished.body);
    const closure = (await owner.query(`SELECT estado,encerrada_por_usuario_id::text,autorizacao_id::text
      FROM ambulatorio.importacao_revisao_encerramento WHERE revisao_id=$1`, [revision])).rows[0];
    expect(closure).toEqual({ estado: 'concluida_com_pendencias', encerrada_por_usuario_id: actor, autorizacao_id: authorization });
    const after = await clinicalState();
    expect(after.pacientes).toBe(before.pacientes); expect(after.atendimentos).toBe(before.atendimentos); expect(after.eventos).toBe(before.eventos);
    // Uma edição posterior permanece: repetição confirma sucesso histórico sem
    // restaurar o valor da revisão já encerrada.
    await owner.query('UPDATE ambulatorio.evento_clinico SET ano_evento=2021 WHERE evento_clinico_id=$1', [event]);
    const repeatedApply = await apply().expect(201);
    expect(repeatedApply.body.resultado).toBe('ja_aplicada');
    expect((await owner.query('SELECT ano_evento FROM ambulatorio.evento_clinico WHERE evento_clinico_id=$1', [event])).rows[0].ano_evento).toBe(2021);
    const historicalCountsBefore = (await owner.query(`SELECT
      (SELECT count(*)::int FROM ambulatorio.importacao_revisao_recebimento) recebimentos,
      (SELECT count(*)::int FROM ambulatorio.importacao_revisao) revisoes,
      (SELECT count(*)::int FROM ambulatorio.importacao_lote) lotes,
      (SELECT count(*)::int FROM ambulatorio.importacao_linha) linhas`)).rows[0];
    const historicalReceipt = await receive().expect(201);
    expect(historicalReceipt.body).toEqual({ ...received.body, reutilizada: true });
    expect((await owner.query(`SELECT
      (SELECT count(*)::int FROM ambulatorio.importacao_revisao_recebimento) recebimentos,
      (SELECT count(*)::int FROM ambulatorio.importacao_revisao) revisoes,
      (SELECT count(*)::int FROM ambulatorio.importacao_lote) lotes,
      (SELECT count(*)::int FROM ambulatorio.importacao_linha) linhas`)).rows[0]).toEqual(historicalCountsBefore);
    await http().post('/importacoes/revisoes/autorizacoes/revogar').auth(token, { type: 'bearer' })
      .send({ autorizacaoId: authorization }).expect(201);
    await receive().expect(403);
    await apply().expect(403);
    await http().post('/importacoes/revisoes/finalizar').auth(token, { type: 'bearer' })
      .send({ revisaoId: revision, autorizacaoId: authorization, acao: 'encerrar' }).expect(403);
  });
});
