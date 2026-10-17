import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import request from 'supertest';
import type { Request, Response } from 'express';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';
import { DatabaseService, Transaction } from '../../src/common/database/database.service';
import { ClinicalMethod, payloadHash } from '../../src/operacoes/operacoes.contract';
import { OperacoesService } from '../../src/operacoes/operacoes.service';
import { PacientesService } from '../../src/pacientes/pacientes.service';
import { RecursosClinicosService } from '../../src/pacientes/recursos-clinicos.service';

const suite = process.env.TEST_CLINICAL_DB ? describe : describe.skip;

suite('R6: recibos atômicos e prova de não aplicação por HTTP real', () => {
  let owner: Pool;
  let app: INestApplication;
  let patientId: string;
  let attendanceId: string;
  let projectId: string;
  const users: Record<string,string> = {};
  const tokens: Record<string,string> = {};
  const http = () => request(app.getHttpServer());
  const path = (resource = '') => `/v1/pacientes/${patientId}${resource ? `/${resource}` : ''}`;
  const send = (method: ClinicalMethod, target: string, body: unknown, operationId: string, perfil = 'edicao') => {
    const call = method === 'POST' ? http().post(target) : method === 'PUT' ? http().put(target) : http().patch(target);
    return call.auth(tokens[perfil],{ type: 'bearer' }).set('X-Operacao-Id',operationId).send(body as object);
  };
  const register = async (method: ClinicalMethod, target: string, body: unknown, perfil = 'edicao') => {
    const operationId = randomUUID();
    const registration = { operacaoId: operationId, metodo: method, caminho: target, corpoHash: payloadHash(body) };
    const result = await http().post('/v1/operacoes').auth(tokens[perfil],{ type: 'bearer' }).send(registration).expect(201);
    expect(result.body).toEqual({ ...registration, estado: 'registrada', expiraEm: expect.any(String) });
    return operationId;
  };
  const verify = (operationId: string, perfil = 'edicao') => http().get(`/v1/operacoes/${operationId}`)
    .auth(tokens[perfil],{ type: 'bearer' });
  const close = (operationId: string, perfil = 'edicao') => http().post(`/v1/operacoes/${operationId}/encerrar`)
    .auth(tokens[perfil],{ type: 'bearer' });
  const footprint = async () => (await owner.query(`SELECT jsonb_build_object(
    'pacientes',(SELECT count(*) FROM ambulatorio.paciente),
    'atendimentos',(SELECT count(*) FROM ambulatorio.atendimento),
    'clinicos',(SELECT count(*) FROM ambulatorio.dados_clinicos_atendimento),
    'familiares',(SELECT count(*) FROM ambulatorio.rastreio_familiar_resultado),
    'exames',(SELECT count(*) FROM ambulatorio.paciente_exame_complementar),
    'tratamentos',(SELECT count(*) FROM ambulatorio.tratamento_benzonidazol),
    'reacoes',(SELECT count(*) FROM ambulatorio.reacao_adversa_benzonidazol),
    'acompanhamentos',(SELECT count(*) FROM ambulatorio.acompanhamento_cuidado),
    'projetos',(SELECT count(*) FROM ambulatorio.paciente_projeto_estudo),
    'notificacoes',(SELECT count(*) FROM ambulatorio.notificacao),
    'encaminhamentos',(SELECT count(*) FROM ambulatorio.encaminhamento),
    'eventos',(SELECT count(*) FROM ambulatorio.evento_clinico),
    'pendencias',(SELECT count(*) FROM ambulatorio.pendencia_atendimento)
  ) AS valores`)).rows[0].valores;

  beforeAll(async () => {
    if (!/^etapa5_clinical_\d+_\d+$/.test(process.env.TEST_CLINICAL_DB!)) throw new Error('Banco descartável obrigatório');
    owner = new Pool({ host: process.env.TEST_OWNER_HOST,port: Number(process.env.TEST_OWNER_PORT),
      user: process.env.TEST_OWNER_USER,password: process.env.TEST_OWNER_PASSWORD,database: process.env.TEST_CLINICAL_DB });
    for (const perfil of ['edicao','administracao','consulta','outro']) {
      const result = await owner.query(`INSERT INTO ambulatorio.usuario_aplicacao(nome,login,senha_hash,perfil)
        VALUES($1,$2,$3,$4) RETURNING usuario_id::text`, [`Operações ${perfil} sintético`,
      `operacoes-${perfil}@example.invalid`,'$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK',perfil === 'outro' ? 'edicao' : perfil]);
      users[perfil] = result.rows[0].usuario_id;
    }
  });
  beforeEach(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    // Test-only transport failure AFTER the real handler and PostgreSQL COMMIT.
    // This middleware is absent from production sources and returns no fake receipt.
    app.use((req: Request,res: Response,next: () => void) => {
      if (req.headers['x-sintetico-perder-resposta'] === 'apos-commit') res.json = function () { this.destroy(); return this; };
      next();
    });
    configureApp(app); await app.init();
    for (const perfil of Object.keys(users)) tokens[perfil] = await app.get(JwtService).signAsync({ sub: users[perfil],typ: 'access' });
    patientId = (await http().post('/v1/pacientes').auth(tokens.administracao,{ type: 'bearer' })
      .send({ nome: 'Paciente de operação sintético' }).expect(201)).body.pacienteId;
    for (const perfil of ['edicao','outro','consulta']) await http().put(`${path()}/acesso/${users[perfil]}`)
      .auth(tokens.administracao,{ type: 'bearer' }).send({ ativo: true,podeEditar: perfil !== 'consulta' }).expect(200);
    attendanceId = (await http().post(path('atendimentos')).auth(tokens.edicao,{ type: 'bearer' })
      .send({ dataAtendimento: '2020-01-01' }).expect(201)).body.atendimentoId;
    projectId = (await http().get('/v1/catalogos/projetos').auth(tokens.edicao,{ type: 'bearer' }).expect(200)).body[0].id;
  });
  afterEach(async () => { jest.restoreAllMocks(); await app?.close(); });
  afterAll(async () => { await owner?.end(); });

  it('comprova resposta perdida das 14 mutações; verificar/encerrar não reexecutam nenhum handler', async () => {
    let createdPatient = '';
    let referralId = '';
    let pendingId = '';
    const patients = app.get(PacientesService);
    const resources = app.get(RecursosClinicosService);
    const definitions: Array<{ method: ClinicalMethod; target: () => string; body: () => unknown;
      key: string; perfil?: string; spy: jest.SpyInstance; capture?: (id: string) => void }> = [
      { method: 'POST',target: () => '/v1/pacientes',body: () => ({ nome: 'Cadastro correlacionado sintético' }),
        key: 'pacienteId',perfil: 'administracao',spy: jest.spyOn(patients,'create'),capture: id => { createdPatient = id; } },
      { method: 'PATCH',target: () => `/v1/pacientes/${createdPatient}`,body: () => ({ versao: '1',nome: 'Edição correlacionada sintética' }),
        key: 'pacienteId',perfil: 'administracao',spy: jest.spyOn(patients,'update') },
      { method: 'POST',target: () => path('atendimentos'),body: () => ({ dataAtendimento: '2020-02-01',
        dadosClinicos: { pesoKg: 70 },pendencias: [{ descricao: 'Filho correlacionado sintético' }] }),
        key: 'atendimentoId',spy: jest.spyOn(patients,'createAttendance'),capture: id => { attendanceId = id; } },
      { method: 'PATCH',target: () => path(`atendimentos/${attendanceId}`),body: () => ({ versao: '1',observacoes: 'Núcleo editado sintético' }),
        key: 'atendimentoId',spy: jest.spyOn(patients,'updateAttendance') },
      { method: 'POST',target: () => path('tratamento-bzn'),body: () => ({ atendimentoId: attendanceId,temIndicacao: null,
        reacoes: [{ descricao: 'Reação correlacionada sintética' }] }),key: 'tratamentoId',spy: jest.spyOn(patients,'createBznTreatment') },
      { method: 'POST',target: () => path('retornos-bzn'),body: () => ({ atendimentoId: attendanceId,tipo: 'retorno_bzn_30_dias',
        dataRealizada: '2020-03-01' }),key: 'retornoId',spy: jest.spyOn(patients,'createBznReturn') },
      { method: 'PUT',target: () => path('projetos'),body: () => ({ projetoId: projectId,participa: null }),
        key: 'projetoId',spy: jest.spyOn(resources,'saveProject') },
      { method: 'PUT',target: () => path('notificacao'),body: () => ({ pacienteNotificado: null }),
        key: 'notificacaoId',spy: jest.spyOn(resources,'saveNotification') },
      { method: 'POST',target: () => path('encaminhamentos'),body: () => ({ atendimentoId: attendanceId,motivo: 'Motivo sintético' }),
        key: 'encaminhamentoId',spy: jest.spyOn(resources,'createReferral'),capture: id => { referralId = id; } },
      { method: 'POST',target: () => path(`encaminhamentos/${referralId}/contrarreferencias`),body: () => ({ resumo: 'Devolutiva sintética' }),
        key: 'contrarreferenciaId',spy: jest.spyOn(resources,'createCounterReferral') },
      { method: 'POST',target: () => path('ocorrencias-anuais'),body: () => ({ ano: 2020 }),
        key: 'eventoId',spy: jest.spyOn(resources,'recordAnnualAttendance') },
      { method: 'POST',target: () => path('retornos-anuais'),body: () => ({ atendimentoId: attendanceId,dataRealizada: '2020-04-01' }),
        key: 'retornoId',spy: jest.spyOn(resources,'createAnnualReturn') },
      { method: 'POST',target: () => path('pendencias'),body: () => ({ atendimentoId: attendanceId,descricao: 'Pendência correlacionada sintética' }),
        key: 'pendenciaId',spy: jest.spyOn(resources,'createPending'),capture: id => { pendingId = id; } },
      { method: 'PATCH',target: () => path(`pendencias/${pendingId}`),body: () => ({ status: 'resolvida',dataResolucao: '2020-05-01' }),
        key: 'pendenciaId',spy: jest.spyOn(resources,'updatePending') },
    ];
    for (const definition of definitions) {
      const body = definition.body(); const target = definition.target(); const perfil = definition.perfil ?? 'edicao';
      const operationId = await register(definition.method,target,body,perfil);
      await expect(send(definition.method,target,body,operationId,perfil).set('X-Sintetico-Perder-Resposta','apos-commit'))
        .rejects.toThrow(/socket hang up|aborted|ECONNRESET/i);
      const before = await footprint();
      const result = (await verify(operationId,perfil).expect(200)).body;
      expect(result).toMatchObject({ estado: 'confirmada',metodo: definition.method,caminho: target,corpoHash: payloadHash(body),
        resultado: { [definition.key]: expect.stringMatching(/^[1-9]\d*$/) } });
      expect(Object.keys(result.resultado).sort()).toEqual([definition.key,
        ...(definition.method === 'PATCH' ? [definition.key === 'pendenciaId' ? 'status' : 'versao'] : [])].sort());
      definition.capture?.(result.resultado[definition.key]);
      await close(operationId,perfil).expect(200).expect(result);
      expect(await footprint()).toEqual(before);
      expect(definition.spy).toHaveBeenCalledTimes(1);
    }
  });

  it('prova rollback de núcleo e filhos e sela tentativa antes de nova confirmação', async () => {
    const body = { dataAtendimento: '2020-06-01',dadosClinicos: { pesoKg: 73 },
      pendencias: [{ descricao: 'Filho antes da falha' },{ descricao: 'Inválida',status: 'resolvida' }] };
    const operationId = await register('POST',path('atendimentos'),body);
    const before = await footprint();
    await send('POST',path('atendimentos'),body,operationId).expect(400);
    await verify(operationId).expect(200).expect(res => {
      expect(res.body).toMatchObject({ estado: 'nao_aplicada',motivo: 'falha' });
      expect(res.body.resultado).toBeUndefined();
    });
    await send('POST',path('atendimentos'),body,operationId).expect(409);
    expect(await footprint()).toEqual(before);
  });

  it('encerra operação registrada e impede chegada tardia; ausência de UUID não é prova', async () => {
    const body = { ano: 2020 }; const target = path('ocorrencias-anuais');
    const operationId = await register('POST',target,body);
    const before = await footprint();
    await verify(operationId).expect(200).expect(res => expect(res.body.estado).toBe('indeterminavel'));
    await close(operationId).expect(200).expect(res => expect(res.body).toMatchObject({ estado: 'nao_aplicada',motivo: 'encerrada' }));
    await send('POST',target,body,operationId).expect(409);
    await verify(randomUUID()).expect(404);
    expect(await footprint()).toEqual(before);
  });

  it('verifica em curso sem cancelar transação; rejeita claim concorrente e confirma uma só ocorrência', async () => {
    const target = path('ocorrencias-anuais'); const body = { ano: 2020 };
    const operationId = await register('POST',target,body);
    const database = app.get(DatabaseService);
    const original = database.transaction.bind(database);
    let entered!: () => void; const ready = new Promise<void>(resolve => { entered = resolve; });
    let release!: () => void; const hold = new Promise<void>(resolve => { release = resolve; });
    let held = false;
    jest.spyOn(database,'transaction').mockImplementation(async <T>(operation: (tx: Transaction) => Promise<T>,actor?: string) => original(async tx => {
      if (actor && !held) { held = true; entered(); await hold; }
      return operation(tx);
    },actor));
    const pending = send('POST',target,body,operationId).then(value => value);
    try {
      await ready;
      await verify(operationId).expect(200).expect(res => expect(res.body.estado).toBe('em_curso'));
      await close(operationId).expect(200).expect(res => expect(res.body.estado).toBe('em_curso'));
      await send('POST',target,body,operationId).expect(409);
    } finally { release(); }
    expect((await pending).status).toBe(201);
    await verify(operationId).expect(200).expect(res => expect(res.body.estado).toBe('confirmada'));
    const rows = await owner.query('SELECT count(*)::int AS total FROM ambulatorio.evento_clinico WHERE paciente_id=$1',[patientId]);
    expect(rows.rows[0].total).toBe(1);
  });

  it('exige prazo sob lock para a clínica mesmo após claim e permite provar expiração sem escrever no GET', async () => {
    const body = { ano: 2020 }; const target = path('ocorrencias-anuais');
    const operationId = await register('POST',target,body);
    const context = await app.get(OperacoesService).claim({ usuarioId: users.edicao,nome: 'Sintético',perfil: 'edicao' },
      operationId,'POST',target,body);
    await owner.query(`UPDATE ambulatorio.operacao_clinica SET criada_em=clock_timestamp()-interval '5 minutes',
      expira_em=clock_timestamp()-interval '1 second' WHERE operacao_id=$1`,[operationId]);
    const before = await footprint();
    const ledgerBefore = (await owner.query('SELECT * FROM ambulatorio.operacao_clinica WHERE operacao_id=$1',[operationId])).rows[0];
    await verify(operationId).expect(200).expect(res => expect(res.body).toMatchObject({ estado: 'nao_aplicada',motivo: 'expirada' }));
    const database = app.get(DatabaseService);
    await expect(database.transaction(tx => context.before(tx))).rejects.toThrow('expirada');
    const ledgerAfter = (await owner.query('SELECT * FROM ambulatorio.operacao_clinica WHERE operacao_id=$1',[operationId])).rows[0];
    expect(ledgerAfter).toEqual(ledgerBefore);
    await send('POST',target,body,operationId).expect(409);
    expect(await footprint()).toEqual(before);
  });

  it('mantém indeterminável após queda entre claim e transação até encerramento linearizado', async () => {
    const body = { ano: 2020 }; const target = path('ocorrencias-anuais');
    const operationId = await register('POST',target,body);
    const service = app.get(OperacoesService);
    const user = { usuarioId: users.edicao,nome: 'Sintético',perfil: 'edicao' as const };
    const scope = await service.claim(user,operationId,'POST',target,body);
    await verify(operationId).expect(200).expect(res => expect(res.body.estado).toBe('indeterminavel'));
    await close(operationId).expect(200).expect(res => expect(res.body.estado).toBe('nao_aplicada'));
    await expect(app.get(DatabaseService).transaction(tx => scope.before(tx))).rejects.toThrow('encerrada');
    await send('POST',target,body,operationId).expect(409);
  });

  it('revalida proprietário e vínculo atual sem revelar recibo; método/hash/contexto não podem mudar', async () => {
    const body = { ano: 2020 }; const target = path('ocorrencias-anuais');
    const operationId = await register('POST',target,body);
    await send('POST',target,{ ano: 2019 },operationId).expect(409);
    await send('POST',path('retornos-anuais'),body,operationId).expect(409);
    await verify(operationId,'outro').expect(404);
    await close(operationId,'outro').expect(404);
    await send('POST',target,body,operationId,'outro').expect(404);
    await http().post('/v1/operacoes').auth(tokens.edicao,{ type: 'bearer' })
      .send({ operacaoId: operationId,metodo: 'POST',caminho: target,corpoHash: payloadHash(body) }).expect(409);
    await send('POST',target,body,operationId).expect(201);
    const before = await footprint();
    await owner.query('UPDATE ambulatorio.acesso_paciente SET ativo=false WHERE usuario_id=$1 AND paciente_id=$2',[users.edicao,patientId]);
    await verify(operationId).expect(403).expect(res => expect(res.body.resultado).toBeUndefined());
    await close(operationId).expect(403);
    await http().post('/v1/operacoes').auth(tokens.edicao,{ type: 'bearer' })
      .send({ operacaoId: randomUUID(),metodo: 'POST',caminho: target,corpoHash: payloadHash(body) }).expect(403);
    await verify(operationId,'outro').expect(404);
    await verify(operationId,'administracao').expect(404);
    expect(await footprint()).toEqual(before);
    await owner.query('UPDATE ambulatorio.acesso_paciente SET ativo=true WHERE usuario_id=$1 AND paciente_id=$2',[users.edicao,patientId]);
    await verify(operationId).expect(200).expect(res => expect(res.body.estado).toBe('confirmada'));
  });

  it('não transforma perda de confirmação COMMIT em falha e distingue dois episódios intencionais iguais', async () => {
    const body = { ano: 2020 }; const target = path('ocorrencias-anuais');
    const first = await register('POST',target,body);
    const firstResult = (await send('POST',target,body,first).expect(201)).body;
    await app.get(OperacoesService).failed({ usuarioId: users.edicao,nome: 'Sintético',perfil: 'edicao' },first);
    await verify(first).expect(200).expect(res => expect(res.body).toMatchObject({ estado: 'confirmada',resultado: firstResult }));
    const second = await register('POST',target,body);
    const secondResult = (await send('POST',target,body,second).expect(201)).body;
    expect(secondResult.eventoId).not.toBe(firstResult.eventoId);
    await send('POST',target,body,first).expect(409);
    await verify(second).expect(200).expect(res => expect(res.body.resultado).toEqual(secondResult));
    const rows = await owner.query('SELECT count(*)::int AS total FROM ambulatorio.evento_clinico WHERE paciente_id=$1',[patientId]);
    expect(rows.rows[0].total).toBe(2);
  });

  it('valida registro e autenticação antes de consultar o ledger', async () => {
    const registration = { operacaoId: randomUUID(),metodo: 'POST',caminho: path('ocorrencias-anuais'),corpoHash: payloadHash({ ano: 2020 }) };
    await http().post('/v1/operacoes').send(registration).expect(401);
    await http().post('/v1/operacoes').auth(tokens.consulta,{ type: 'bearer' }).send(registration).expect(403);
    await http().post('/v1/operacoes').auth(tokens.edicao,{ type: 'bearer' }).send({ ...registration,caminho: '/v1/importacoes' }).expect(400);
    for (const caminho of ['/v1/pacientes/9223372036854775808/atendimentos',
      `/v1/pacientes/${patientId}/atendimentos/9999999999999999999`]) {
      await http().post('/v1/operacoes').auth(tokens.administracao,{ type: 'bearer' })
        .send({ ...registration,metodo: caminho.endsWith('/atendimentos') ? 'POST' : 'PATCH',caminho }).expect(400);
    }
    await http().post('/v1/operacoes').auth(tokens.edicao,{ type: 'bearer' }).send({ ...registration,corpoHash: 'errado' }).expect(400);
    await http().post('/v1/operacoes').auth(tokens.edicao,{ type: 'bearer' }).send({ ...registration,corpo: { nome: 'Não permitido' } }).expect(400);
    await http().get('/v1/operacoes/uuid-invalido').auth(tokens.edicao,{ type: 'bearer' }).expect(400);
    await http().get(`/v1/operacoes/${registration.operacaoId}`).expect(401);
  });
});
