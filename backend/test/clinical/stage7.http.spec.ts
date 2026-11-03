import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';

const suite = process.env.TEST_CLINICAL_DB ? describe : describe.skip;

suite('Invariantes dos fluxos /v1 da Etapa 7', () => {
  let app: INestApplication;
  let owner: Pool;
  let patientId: string;
  let attendanceId: string;
  let examId: string;
  const ids: Record<string, string> = {};
  const tokens: Record<string, string> = {};
  const http = () => request(app.getHttpServer());
  const path = (resource = '') => `/v1/pacientes/${patientId}${resource ? `/${resource}` : ''}`;
  const patientFootprint = async () => (await owner.query(`SELECT
    (SELECT count(*)::int FROM ambulatorio.atendimento WHERE paciente_id=$1) AS atendimentos,
    (SELECT count(*)::int FROM ambulatorio.dados_clinicos_atendimento c JOIN ambulatorio.atendimento a USING(atendimento_id)
      WHERE a.paciente_id=$1) AS avaliacoes,
    (SELECT count(*)::int FROM ambulatorio.diagnostico_chagas d JOIN ambulatorio.atendimento a USING(atendimento_id)
      WHERE a.paciente_id=$1) AS diagnosticos,
    (SELECT count(*)::int FROM ambulatorio.paciente_exame_complementar WHERE paciente_id=$1) AS exames,
    (SELECT count(*)::int FROM ambulatorio.pendencia_atendimento p JOIN ambulatorio.atendimento a USING(atendimento_id)
      WHERE a.paciente_id=$1) AS pendencias,
    (SELECT count(*)::int FROM ambulatorio.rastreio_familiar WHERE paciente_id=$1) AS rastreios,
    (SELECT count(*)::int FROM ambulatorio.rastreio_familiar_resultado r JOIN ambulatorio.rastreio_familiar f USING(rastreio_familiar_id)
      WHERE f.paciente_id=$1) AS resultados`, [patientId])).rows[0];

  beforeAll(async () => {
    if (!/^etapa5_clinical_\d+_\d+$/.test(process.env.TEST_CLINICAL_DB!)) throw new Error('Banco descartável obrigatório');
    owner = new Pool({ host: process.env.TEST_OWNER_HOST, port: Number(process.env.TEST_OWNER_PORT),
      user: process.env.TEST_OWNER_USER, password: process.env.TEST_OWNER_PASSWORD, database: process.env.TEST_CLINICAL_DB });
    for (const perfil of ['consulta', 'edicao', 'administracao']) {
      const result = await owner.query(`INSERT INTO ambulatorio.usuario_aplicacao(nome,login,senha_hash,perfil)
        VALUES($1,$2,$3,$4) RETURNING usuario_id::text`, [perfil, `etapa7-${perfil}@example.invalid`,
        '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK', perfil]);
      ids[perfil] = result.rows[0].usuario_id;
    }
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication(); configureApp(app); await app.init();
    for (const perfil of Object.keys(ids)) tokens[perfil] = await app.get(JwtService).signAsync({ sub: ids[perfil], typ: 'access' });
    patientId = (await http().post('/v1/pacientes').auth(tokens.administracao, { type: 'bearer' })
      .send({ nome: 'Paciente Etapa 7 Sintético' }).expect(201)).body.pacienteId;
    for (const perfil of ['consulta', 'edicao']) await http().put(`${path()}/acesso/${ids[perfil]}`)
      .auth(tokens.administracao, { type: 'bearer' }).send({ ativo: true, podeEditar: perfil === 'edicao' }).expect(200);
    const catalog = (await http().get('/v1/catalogos/exames?limit=100').auth(tokens.edicao, { type: 'bearer' }).expect(200)).body;
    examId = catalog.find((item: { codigo: string }) => item.codigo === 'holter').id;
  });
  afterAll(async () => { await app?.close(); await owner?.end(); });

  it('consulta capacidade de cadastro conforme a política, sem ampliar o vínculo', async () => {
    await http().get('/v1/pacientes/capacidades').expect(401);
    for (const perfil of ['consulta', 'edicao', 'administracao']) {
      await http().get('/v1/pacientes/capacidades').auth(tokens[perfil], { type: 'bearer' })
        .expect(200).expect({ podeCadastrar: perfil !== 'consulta' });
    }
    await http().post('/v1/pacientes').auth(tokens.edicao, { type: 'bearer' })
      .send({ nome: 'Cadastro vinculado sintético' }).expect(201);
  });

  it('integra cadastro por Edição, vínculo específico, PATCH, atendimento, revogação e inativação', async () => {
    const creator = (await owner.query(`INSERT INTO ambulatorio.usuario_aplicacao(nome,login,senha_hash,perfil)
      VALUES('Criador sintético','criador-integrado@example.invalid',
      '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','edicao') RETURNING usuario_id::text`)).rows[0].usuario_id;
    const token = await app.get(JwtService).signAsync({ sub: creator, typ: 'access' });
    const created = (await http().post('/v1/pacientes').auth(token, { type: 'bearer' })
      .send({ nome: 'Cadastro integrado Edição sintético', telefones: ['000000001'],
        endereco: { cidade: 'Cidade sintética' } }).expect(201)).body;
    const target = `/v1/pacientes/${created.pacienteId}`;
    const current = (await http().get(target).auth(token, { type: 'bearer' }).expect(200)).body;
    expect(current).toMatchObject({ nome: 'Cadastro integrado Edição sintético', telefones: ['000000001'], endereco: { cidade: 'Cidade sintética' } });
    await http().get(target).auth(tokens.edicao, { type: 'bearer' }).expect(403);
    await http().get(target).auth(tokens.consulta, { type: 'bearer' }).expect(403);
    await http().get(path()).auth(token, { type: 'bearer' }).expect(403);
    await http().put(`${path()}/acesso/${creator}`).auth(token, { type: 'bearer' })
      .send({ ativo: true, podeEditar: true }).expect(403);
    await http().patch(target).auth(token, { type: 'bearer' })
      .send({ versao: current.versao, raca: 'Informação sintética' }).expect(200);
    await http().patch(target).auth(token, { type: 'bearer' })
      .send({ versao: current.versao, nome: 'Sobrescrita recusada sintética' }).expect(409);
    await http().post(`${target}/atendimentos`).auth(token, { type: 'bearer' })
      .send({ dataAtendimento: '2026-04-03' }).expect(201);
    const audit = (await owner.query(`SELECT ator_usuario_id::text,ativo,pode_editar,principal_db
      FROM ambulatorio.acesso_paciente_evento WHERE paciente_id=$1`, [created.pacienteId])).rows;
    expect(audit).toEqual([{ ator_usuario_id: creator, ativo: true, pode_editar: true, principal_db: process.env.APP_DB_USER }]);
    await http().put(`${target}/acesso/${creator}`).auth(tokens.administracao, { type: 'bearer' })
      .send({ ativo: false, podeEditar: false }).expect(200);
    await http().get(target).auth(token, { type: 'bearer' }).expect(403);
    await http().put(`${target}/acesso/${creator}`).auth(tokens.administracao, { type: 'bearer' })
      .send({ ativo: true, podeEditar: true }).expect(200);
    await owner.query('UPDATE ambulatorio.usuario_aplicacao SET ativo=false WHERE usuario_id=$1', [creator]);
    await http().get(target).auth(token, { type: 'bearer' }).expect(401);
    await owner.query('UPDATE ambulatorio.usuario_aplicacao SET ativo=true WHERE usuario_id=$1', [creator]);
    await http().get(target).auth(token, { type: 'bearer' }).expect(401);
    const generation = (await owner.query('SELECT geracao_sessao::text FROM ambulatorio.usuario_aplicacao WHERE usuario_id=$1', [creator])).rows[0].geracao_sessao;
    const renewed = await app.get(JwtService).signAsync({ sub: creator, typ: 'access', ver: generation });
    await http().get(target).auth(renewed, { type: 'bearer' }).expect(403);
    expect((await owner.query(`SELECT ativo FROM ambulatorio.acesso_paciente WHERE paciente_id=$1 AND usuario_id=$2`,
      [created.pacienteId, creator])).rows).toEqual([{ ativo: false }]);
    expect((await owner.query(`SELECT ator_usuario_id,principal_db FROM ambulatorio.acesso_paciente_evento
      WHERE paciente_id=$1 ORDER BY acesso_paciente_evento_id DESC LIMIT 1`, [created.pacienteId])).rows)
      .toEqual([{ ator_usuario_id: null, principal_db: process.env.TEST_OWNER_USER }]);
  });

  it('serializa cadastro e concessão concorrentes com inativação sem restaurar acesso', async () => {
    const target = (await owner.query(`INSERT INTO ambulatorio.usuario_aplicacao(nome,login,senha_hash,perfil)
      VALUES('Corrida sintética','corrida-cadastro@example.invalid',
      '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','edicao') RETURNING usuario_id::text`)).rows[0].usuario_id;
    const token = await app.get(JwtService).signAsync({ sub: target, typ: 'access' });
    const first = await owner.connect();
    const second = await owner.connect();
    let pendingGrant: Promise<unknown> | undefined;
    let pendingCreate: Promise<request.Response> | undefined;
    const waitForLock = async (fragment: string) => {
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        const locked = await owner.query(`SELECT 1 FROM pg_stat_activity
          WHERE datname=current_database() AND wait_event_type='Lock' AND cardinality(pg_blocking_pids(pid))>0
          AND query LIKE $1`, [`%${fragment}%`]);
        if (locked.rowCount) return;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      throw new Error('Operação não aguardou a identidade bloqueada');
    };
    try {
      await first.query('BEGIN');
      await first.query('UPDATE ambulatorio.usuario_aplicacao SET ativo=false WHERE usuario_id=$1', [target]);
      pendingCreate = http().post('/v1/pacientes').auth(token, { type: 'bearer' })
        .send({ nome: 'Cadastro concorrente recusado sintético' }).then(response => response);
      await waitForLock('INSERT INTO paciente');
      await first.query('COMMIT');
      expect((await pendingCreate).status).toBe(401);
      expect((await owner.query(`SELECT 1 FROM ambulatorio.paciente WHERE nome='Cadastro concorrente recusado sintético'`)).rowCount).toBe(0);
      await first.query('UPDATE ambulatorio.usuario_aplicacao SET ativo=true WHERE usuario_id=$1', [target]);
      await first.query('BEGIN');
      await first.query('UPDATE ambulatorio.usuario_aplicacao SET ativo=false WHERE usuario_id=$1', [target]);
      await second.query('BEGIN');
      await second.query('SET LOCAL ROLE ambulatorio_servico_autenticado');
      await second.query('SELECT ambulatorio.auditoria_iniciar_aplicacao($1)', [ids.administracao]);
      pendingGrant = second.query('SELECT ambulatorio.definir_acesso_paciente($1,$2,true,true)', [patientId, target])
        .then(() => ({ code: 'concessao_indevida' }), error => ({ code: error.code }));
      await waitForLock('SELECT ambulatorio.definir_acesso_paciente');
      await first.query('COMMIT');
      expect(await pendingGrant).toEqual({ code: '42501' });
      await second.query('ROLLBACK');
      await first.query('UPDATE ambulatorio.usuario_aplicacao SET ativo=true WHERE usuario_id=$1', [target]);
      expect((await owner.query('SELECT 1 FROM ambulatorio.acesso_paciente WHERE usuario_id=$1 AND ativo', [target])).rowCount).toBe(0);
    } finally {
      await first.query('ROLLBACK');
      if (pendingCreate) await pendingCreate;
      if (pendingGrant) await pendingGrant;
      await second.query('ROLLBACK');
      first.release(); second.release();
    }
  });

  it('preserva todos os filhos aceitos, estados desconhecidos e datas clínicas na mesma criação', async () => {
    const payload = { dataAtendimento: '2020-02-01', localizacaoProntuario: 'Local sintético',
      ambulatorioUnicamente: false, ambulatorioAnexoProjeto: null, observacoes: 'Observação do núcleo sintética',
      dadosClinicos: { alturaCm: 170.25, pesoKg: 70.50, circunferenciaAbdominalCm: 90.25,
        frequenciaCardiacaBpm: 72, saturacaoPercentual: 98.50, paSistolicaMmhg: 120, paDiastolicaMmhg: 80,
        nyha: 'Classe sintética', observacoes: 'Avaliação sintética' },
      diagnosticoChagas: { possuiDiagnosticoChagas: null, statusDiagnostico: 'inconclusivo', resultadoFinal: 'indeterminado',
        dataDescobertaAutorelato: '2010-02-01', dataResultadoFinal: '2019-02-01', criterioConfirmacao: 'Critério sintético',
        observacoes: 'Relato sintético' },
      exames: [{ tipoExameId: examId, bloco: 'solicitado', identificacao: 'Exame identificado sintético', resultado: null,
        observacoes: 'Solicitação sintética' }],
      pendencias: [{ descricao: 'Pendência resolvida sintética', status: 'resolvida', dataResolucao: '2020-02-02' },
        { descricao: 'Estado desconhecido sintético', status: null }],
      rastreioFamiliar: { familiaresExaminados: true, familiares: [{ familiar: 'Familiar A sintético', resultado: 'Resultado A sintético' },
        { familiar: 'Familiar B sintético', resultado: 'Resultado B sintético' }] } };
    attendanceId = (await http().post(path('atendimentos')).auth(tokens.edicao, { type: 'bearer' }).send(payload).expect(201))
      .body.atendimentoId;
    const detail = (await http().get(path(`atendimentos/${attendanceId}`)).auth(tokens.consulta, { type: 'bearer' }).expect(200)).body;
    expect(detail).toMatchObject({ atendimentoId: attendanceId, dataAtendimento: payload.dataAtendimento,
      localizacaoProntuario: payload.localizacaoProntuario, ambulatorioUnicamente: false, ambulatorioAnexoProjeto: null,
      observacoes: payload.observacoes, diagnosticoChagas: payload.diagnosticoChagas });
    expect(detail.dadosClinicos).toEqual({ ...payload.dadosClinicos, alturaCm: '170.25', pesoKg: '70.50',
      circunferenciaAbdominalCm: '90.25', saturacaoPercentual: '98.50' });
    expect(detail.exames).toEqual([expect.objectContaining({ atendimentoId: attendanceId, bloco: 'solicitado',
      identificacao: payload.exames[0].identificacao, resultado: null, observacoes: payload.exames[0].observacoes, codigoExame: 'holter' })]);
    expect(detail.pendencias).toEqual([expect.objectContaining({ descricao: payload.pendencias[0].descricao,
      status: 'resolvida', dataIdentificacao: payload.dataAtendimento, dataResolucao: '2020-02-02' }),
    expect.objectContaining({ descricao: payload.pendencias[1].descricao, status: null, dataResolucao: null })]);
    expect(detail.rastreioFamiliar.familiares).toEqual(payload.rastreioFamiliar.familiares.map(item => expect.objectContaining({
      identificacaoFamiliar: item.familiar, resultadoSorologia: item.resultado })));
    expect(await patientFootprint()).toEqual({ atendimentos: 1, avaliacoes: 1, diagnosticos: 1, exames: 1,
      pendencias: 2, rastreios: 1, resultados: 2 });
  });

  it('reverte núcleo e filhos quando uma pendência resolvida não informa data', async () => {
    const before = await patientFootprint();
    await http().post(path('atendimentos')).auth(tokens.edicao, { type: 'bearer' }).send({ dataAtendimento: '2020-03-01',
      dadosClinicos: { pesoKg: 75 }, diagnosticoChagas: { dataDescobertaAutorelato: '2011-01-01' },
      exames: [{ tipoExameId: examId, bloco: 'trazido', resultado: 'Resultado que será revertido' }],
      pendencias: [{ descricao: 'Primeiro filho válido sintético' }, { descricao: 'Resolução sem data', status: 'resolvida' }],
      rastreioFamiliar: { familiaresExaminados: null, familiares: [] } }).expect(400);
    expect(await patientFootprint()).toEqual(before);
    for (const pending of [{ descricao: 'Sem data sintética', status: 'resolvida' },
      { descricao: 'Com data incompatível sintética', status: 'aberta', dataResolucao: '2020-03-01' }]) {
      await http().post(path('pendencias')).auth(tokens.edicao, { type: 'bearer' })
        .send({ atendimentoId: attendanceId, ...pending }).expect(400);
    }
    expect(await patientFootprint()).toEqual(before);
    const saved = (await http().post(path('pendencias')).auth(tokens.edicao, { type: 'bearer' })
      .send({ atendimentoId: attendanceId, descricao: 'Resolução explícita sintética', status: 'resolvida',
        dataIdentificacao: '2020-03-01', dataResolucao: '2020-03-02' }).expect(201)).body;
    const resolved = (await http().get(`${path('pendencias')}?status=resolvida`).auth(tokens.consulta, { type: 'bearer' }).expect(200)).body;
    expect(resolved).toEqual(expect.arrayContaining([expect.objectContaining({ pendenciaId: saved.pendenciaId,
      dataIdentificacao: '2020-03-01', dataResolucao: '2020-03-02' })]));
  });

  it('recusa escrita com tipo de catálogo inativado depois da seleção', async () => {
    const newType = await owner.query(`INSERT INTO ambulatorio.tipo_exame_complementar(codigo_exame,nome_exame,ativo)
      VALUES('exame_etapa7_selecao_sintetica','Exame Etapa 7 Sintético',true) RETURNING tipo_exame_complementar_id::text AS id`);
    const typeId = newType.rows[0].id;
    const catalog = (await http().get('/v1/catalogos/exames?limit=100').auth(tokens.edicao, { type: 'bearer' }).expect(200)).body;
    expect(catalog).toEqual(expect.arrayContaining([expect.objectContaining({ id: typeId, ativo: true })]));
    await owner.query('UPDATE ambulatorio.tipo_exame_complementar SET ativo=false WHERE tipo_exame_complementar_id=$1', [typeId]);
    const before = await patientFootprint();
    await http().post(path('atendimentos')).auth(tokens.edicao, { type: 'bearer' })
      .send({ dataAtendimento: '2020-03-01', exames: [{ tipoExameId: typeId, bloco: 'solicitado' }] }).expect(400);
    expect(await patientFootprint()).toEqual(before);
  });

  it('mantém BZN único, retornos repetíveis e recusa comparecimentos futuros', async () => {
    const bzn = { atendimentoId: attendanceId, temIndicacao: null, iniciado: null, tratamentoPeloAmbulatorio: false,
      duracaoCumpridaDias: 30, anoUsoAproximado: 2019, dataPrescricao: null, motivoNaoIndicacao: 'Texto sintético independente',
      motivoNaoInicio: 'Outro texto sintético independente', teveReacaoAdversa: null, observacoes: 'BZN sintético',
      reacoes: [{ descricao: 'Reação sintética', gravidade: 'Livre sintética', dataReacao: '2019-03-01',
        consequencia: 'Consequência sintética', observacoes: 'Observação da reação sintética' }] };
    await http().post(path('tratamento-bzn')).auth(tokens.edicao, { type: 'bearer' }).send(bzn).expect(201);
    await http().post(path('tratamento-bzn')).auth(tokens.edicao, { type: 'bearer' }).send(bzn).expect(409);
    const canonical = (await http().get(path('tratamento-bzn')).auth(tokens.consulta, { type: 'bearer' }).expect(200)).body;
    expect(canonical).toMatchObject(bzn);
    for (const [tipo, dataRealizada] of [['retorno_bzn_30_dias', '2020-03-01'], ['retorno_bzn_30_dias', '2020-03-02'],
      ['retorno_bzn_final', '2020-04-01']]) {
      await http().post(path('retornos-bzn')).auth(tokens.edicao, { type: 'bearer' })
        .send({ atendimentoId: attendanceId, tipo, dataRealizada }).expect(201);
    }
    for (const dataRealizada of ['2020-03-01', '2020-03-02']) await http().post(path('retornos-anuais'))
      .auth(tokens.edicao, { type: 'bearer' }).send({ atendimentoId: attendanceId, dataRealizada }).expect(201);
    await http().post(path('retornos-bzn')).auth(tokens.edicao, { type: 'bearer' })
      .send({ atendimentoId: attendanceId, tipo: 'retorno_bzn_final', dataRealizada: '9999-12-31' }).expect(400);
    await http().post(path('retornos-anuais')).auth(tokens.edicao, { type: 'bearer' })
      .send({ atendimentoId: attendanceId, dataRealizada: '9999-12-31' }).expect(400);
    const returns = (await http().get(path('retornos-bzn')).auth(tokens.consulta, { type: 'bearer' }).expect(200)).body;
    const annual = (await http().get(path('retornos-anuais')).auth(tokens.consulta, { type: 'bearer' }).expect(200)).body;
    expect(returns.map((item: { dataRealizada: string }) => item.dataRealizada)).toEqual(['2020-04-01', '2020-03-02', '2020-03-01']);
    expect(new Set(returns.map((item: { retornoId: string }) => item.retornoId)).size).toBe(3);
    expect(annual.map((item: { dataRealizada: string }) => item.dataRealizada)).toEqual(['2020-03-02', '2020-03-01']);
    expect(new Set(annual.map((item: { retornoId: string }) => item.retornoId)).size).toBe(2);
  });
});
