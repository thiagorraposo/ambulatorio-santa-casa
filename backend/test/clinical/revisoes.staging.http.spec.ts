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
  let patient: string; let attendance: string; let event: string; let field: string;
  let source: string; let authorization: string; let baseLot: string; let baseLine: string;
  let fixture: string; let directory: string; let physical: { aba: string; ordem: number; bruto: unknown[] };
  const profileTokens: Record<string, string> = {};
  const manifestText = readFileSync(resolve(process.cwd(), '../manifestos/planilha_ambulatorio_v1.json'), 'utf8');
  const manifest = JSON.parse(manifestText) as { versao: string; layout_versao: string };
  const transformText = JSON.stringify({ formato: 'revisao-transformacoes/v1', regras: [
    { chave: 'retorno_anual_realizado', bloco: 'geral', ocorrencia: 1,
      tabela: 'evento_clinico', coluna: 'ano_evento', transformacao: 'ano' }] });
  const sha = (bytes: string) => createHash('sha256').update(bytes).digest('hex');
  const http = () => request(app.getHttpServer());
  const envelope = (value: number) => ({ estado: 'valor', valor: value, tipo_sql: 'integer',
    precisao: 'ano', serializacao_versao: 'v1' });
  const fields = () => [{ campoId: field, registroId: event, alvoChave: 'evento_anual',
    chaveSemantica: 'retorno_anual_realizado', blocoFuncional: 'geral', ocorrencia: 1,
    categoria: 'correcao_ocorrencia', operacao: 'definir', base: envelope(2023), proposto: envelope(2022) }];
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

  beforeAll(async () => {
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
      patient = (await seed.query("INSERT INTO ambulatorio.paciente(nome) VALUES('Paciente anual revisão HTTP sintético') RETURNING paciente_id::text")).rows[0].paciente_id;
      attendance = (await seed.query(`INSERT INTO ambulatorio.atendimento(paciente_id,data_atendimento)
        VALUES($1,'2026-01-01') RETURNING atendimento_id::text`, [patient])).rows[0].atendimento_id;
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
      event = (await seed.query(`INSERT INTO ambulatorio.evento_clinico(paciente_id,tipo_evento,ano_evento)
        VALUES($1,'ultimo_comparecimento_ano_informado',2023) RETURNING evento_clinico_id::text`, [patient])).rows[0].evento_clinico_id;
      await seed.query(`INSERT INTO ambulatorio.importacao_registro(importacao_linha_id,tabela_destino,registro_id,acao)
        VALUES($1,'paciente',$2,'criado'),($1,'atendimento',$3,'criado'),($1,'evento_clinico',$4,'criado')`,
      [baseLine,patient,attendance,event]);
      await seed.query('RESET ROLE');
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
  afterAll(async () => { await app?.close(); await owner?.end(); if (directory) rmSync(directory, { recursive: true, force: true }); });

  it('recusa arquivo incompleto, artefato não cadastrado e autorização ausente sem persistência', async () => {
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

  it('integra recebimento, aprovação, rollback, dois executores e encerramento atribuível', async () => {
    const before = await clinicalState();
    const staged = await Promise.all([receive().expect(201),receive().expect(201)]);
    expect(staged.map(response => response.body.reutilizada).sort()).toEqual([false,true]);
    expect(staged[0].body.revisaoId).toBe(staged[1].body.revisaoId);
    const received = staged.find(response => !response.body.reutilizada)!;
    expect(received.body).toMatchObject({ reutilizada: false, linhas: [
      { abaOrdem: 2, numeroLinha: 2 }, { abaOrdem: 2, numeroLinha: 3 }] });
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
    expect(JSON.stringify(received.body)).not.toMatch(/Paciente|dadosBrutos|senha|stack|2023|2022/i);
    const applyBody = { decisaoId: approved.body.decisaoId, autorizacaoId: authorization };
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
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='SENTINELA_CLINICA_NAO_VAZAR'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER zz_etapa5_falha_http AFTER UPDATE ON ambulatorio.evento_clinico
        FOR EACH ROW EXECUTE FUNCTION ambulatorio.etapa5_falha_http()`);
    try {
      const failure = await apply().expect(409);
      expect(JSON.stringify(failure.body)).not.toMatch(/SENTINELA|Paciente|2022|stack|dadosBrutos/);
      const rolledBack = await clinicalState();
      expect({ ...rolledBack, aplicacoes: before.aplicacoes }).toEqual(before);
      const diagnostic = (await owner.query(`SELECT resultado,codigo_resultado FROM ambulatorio.importacao_revisao_aplicacao
        WHERE decisao_id=$1`, [approved.body.decisaoId])).rows;
      expect(diagnostic).toEqual([{ resultado: 'falha_operacional', codigo_resultado: 'revisao_aplicacao_integridade' }]);
      expect((await owner.query('SELECT ano_evento FROM ambulatorio.evento_clinico WHERE evento_clinico_id=$1', [event])).rows[0].ano_evento).toBe(2023);
    } finally {
      await owner.query('DROP TRIGGER zz_etapa5_falha_http ON ambulatorio.evento_clinico; DROP FUNCTION ambulatorio.etapa5_falha_http()');
    }
    const concurrent = await Promise.all([apply().expect(201), apply().expect(201)]);
    expect(concurrent.map(response => response.body.resultado).sort()).toEqual(['aplicada','ja_aplicada']);
    expect(concurrent[0].body.aplicacaoId).toBe(concurrent[1].body.aplicacaoId);
    expect((await owner.query(`SELECT count(*)::int n FROM ambulatorio.importacao_revisao_aplicacao
      WHERE decisao_id=$1 AND resultado='aplicada'`, [approved.body.decisaoId])).rows[0].n).toBe(1);
    expect((await owner.query('SELECT ano_evento FROM ambulatorio.evento_clinico WHERE evento_clinico_id=$1', [event])).rows[0].ano_evento).toBe(2022);
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
