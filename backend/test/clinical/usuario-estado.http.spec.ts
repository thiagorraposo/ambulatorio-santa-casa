import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { hash } from 'bcryptjs';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';
const suite = process.env.TEST_CLINICAL_DB ? describe : describe.skip;
suite('8D2B.2 estado administrativo integrado', () => {
  let app: INestApplication; let owner: Pool;
  const ids: Record<string, string> = {};
  const http = () => request(app.getHttpServer());
  const token = async (name: string) => {
    const row = (await owner.query('SELECT geracao_sessao::text FROM ambulatorio.usuario_aplicacao WHERE usuario_id=$1', [ids[name]])).rows[0];
    return app.get(JwtService).signAsync({ sub: ids[name], typ: 'access', ver: row.geracao_sessao });
  };
  const body = (ativo = false, versao = '1') => ({ operacaoId: randomUUID(), ativo, versao, justificativa: 'Ajuste sintético de situação' });
  const post = (auth: string, name: string, dto: object) => http().post(`/v1/usuarios/${ids[name]}/estado`).auth(auth, { type: 'bearer' }).send(dto);
  beforeAll(async () => {
    if (!/^etapa5_clinical_\d+_\d+$/.test(process.env.TEST_CLINICAL_DB!)) throw new Error('Banco descartável obrigatório');
    owner = new Pool({ host: process.env.TEST_OWNER_HOST, port: Number(process.env.TEST_OWNER_PORT), user: process.env.TEST_OWNER_USER,
      password: process.env.TEST_OWNER_PASSWORD, database: process.env.TEST_CLINICAL_DB });
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication(); configureApp(app); await app.init();
    const password = await hash('Estado-sintetica!123', 4);
    for (const name of ['adminA', 'adminB', 'consulta', 'edicao', 'alvo', 'corrida']) {
      ids[name] = (await owner.query(`INSERT INTO ambulatorio.usuario_aplicacao(nome,login,senha_hash,perfil)
        VALUES($1,$2,$3,$4) RETURNING usuario_id::text`, [`Estado ${name} Sintético`, `estado-${name.toLowerCase()}@example.invalid`, password,
        name.startsWith('admin') ? 'administracao' : name === 'edicao' || name === 'alvo' ? 'edicao' : 'consulta'])).rows[0].usuario_id;
    }
  });
  afterAll(async () => { await app?.close(); await owner?.end(); });
  it('nega anônimo/Consulta/Edição e valida booleano, versão, justificativa e campos extras', async () => {
    await http().post('/v1/usuarios/invalido/estado').send(body()).expect(401);
    for (const name of ['consulta', 'edicao']) await post(await token(name), 'alvo', body()).expect(403);
    const auth = await token('adminA');
    for (const change of [{ ativo: 'false' }, { ativo: null }, { ativo: 0 }, { perfil: 'administracao' },
      { versao: 1 }, { versao: '01' }, { justificativa: 'curta' }, { operacaoId: 'invalido' }]) {
      await post(auth, 'alvo', { ...body(), ...change }).expect(400);
    }
    await http().post(`/v1/usuarios/${ids.alvo}/estado?extra=1`).auth(auth, { type: 'bearer' }).send(body()).expect(400);
  });
  it('proíbe autoativação/inativação sem mudar versão nem revogar o ator', async () => {
    const auth = await token('adminA'); const dto = body();
    await post(auth, 'adminA', dto).expect(403);
    await http().get('/v1/auth/me').auth(auth, { type: 'bearer' }).expect(200);
    const receipt = await http().get(`/v1/usuarios/${ids.adminA}/operacoes/${dto.operacaoId}`).auth(await token('adminB'), { type: 'bearer' }).expect(200);
    expect(receipt.body).toMatchObject({ operacao: 'estado', resultado: 'autoacao_proibida', anterior: true, novo: false, versaoAnterior: '1', versaoNova: '1' });
  });
  it('inativa atomicamente, revoga JWT e vínculos; reativa sem restaurar acesso ou tokens antigos', async () => {
    const old = await token('alvo'); const auth = await token('adminA');
    const created = (await http().post('/v1/pacientes').auth(old, { type: 'bearer' }).send({ nome: 'Estado vínculo sintético' }).expect(201)).body;
    await http().get(`/v1/pacientes/${created.pacienteId}`).auth(old, { type: 'bearer' }).expect(200);
    const dto = body(); const saved = await post(auth, 'alvo', dto).expect(201);
    expect(saved.body).toMatchObject({ operacao: 'estado', resultado: 'aplicada', anterior: true, novo: false, versaoNova: '2' });
    expect((await owner.query('SELECT ativo FROM ambulatorio.acesso_paciente WHERE paciente_id=$1 AND usuario_id=$2', [created.pacienteId, ids.alvo])).rows).toEqual([{ ativo: false }]);
    expect((await owner.query('SELECT ator_usuario_id::text FROM ambulatorio.acesso_paciente_evento WHERE paciente_id=$1 AND NOT ativo', [created.pacienteId])).rows).toEqual([{ ator_usuario_id: ids.adminA }]);
    await http().get('/v1/auth/me').auth(old, { type: 'bearer' }).expect(401);
    await http().post('/v1/auth/login').send({ login: 'estado-alvo@example.invalid', senha: 'Estado-sintetica!123' }).expect(401);
    const inactivated = await token('alvo');
    const replay = await post(auth, 'alvo', dto).expect(201); expect(replay.body).toEqual(saved.body);
    const receipt = await http().get(`/v1/usuarios/${ids.alvo}/operacoes/${dto.operacaoId}`).auth(await token('adminB'), { type: 'bearer' }).expect(200);
    expect(receipt.body).toEqual(saved.body);
    await post(auth, 'alvo', body(true, '2')).expect(201);
    await http().get('/v1/auth/me').auth(old, { type: 'bearer' }).expect(401);
    await http().get('/v1/auth/me').auth(inactivated, { type: 'bearer' }).expect(401);
    const login = await http().post('/v1/auth/login').send({ login: 'estado-alvo@example.invalid', senha: 'Estado-sintetica!123' }).expect(201);
    await http().get('/v1/auth/me').auth(login.body.accessToken, { type: 'bearer' }).expect(200);
    await http().get(`/v1/pacientes/${created.pacienteId}`).auth(login.body.accessToken, { type: 'bearer' }).expect(403);
    expect((await owner.query('SELECT versao_conta::text FROM ambulatorio.usuario_aplicacao WHERE usuario_id=$1', [ids.alvo])).rows[0].versao_conta).toBe('3');
    await post(auth, 'alvo', { ...dto, ativo: true }).expect(409);
  });
  it('audita estado igual, versão obsoleta e alvo inexistente sem mutação', async () => {
    const auth = await token('adminA');
    for (const dto of [body(true), body(false, '9')]) {
      await post(auth, 'consulta', dto).expect(409);
      const found = await http().get(`/v1/usuarios/${ids.consulta}/operacoes/${dto.operacaoId}`).auth(auth, { type: 'bearer' }).expect(200);
      expect(found.body.resultado).toBe(dto.ativo ? 'estado_inalterado' : 'versao_obsoleta');
    }
    await http().post('/v1/usuarios/9223372036854775807/estado').auth(auth, { type: 'bearer' }).send(body()).expect(404);
  });
  it('concorrência perfil×estado usa a mesma versão e UUID não muda de comando', async () => {
    const auth = await token('adminA'); const state = body();
    const profile = { operacaoId: randomUUID(), versao: '1', perfil: 'edicao', justificativa: 'Perfil concorrente sintético' };
    const results = await Promise.all([post(auth, 'corrida', state), http().post(`/v1/usuarios/${ids.corrida}/perfil`).auth(auth, { type: 'bearer' }).send(profile)]);
    expect(results.map(row => row.status).sort()).toEqual([201, 409]);
    await http().post(`/v1/usuarios/${ids.corrida}/perfil`).auth(auth, { type: 'bearer' }).send({ ...profile, operacaoId: state.operacaoId, justificativa: state.justificativa }).expect(409);
    expect((await owner.query('SELECT count(*)::int AS n FROM ambulatorio.usuario_conta_operacao WHERE usuario_id=$1', [ids.corrida])).rows[0].n).toBe(2);
  });
  it('inativação×despromoção cruzadas preservam um administrador ativo', async () => {
    const existing = (await owner.query("SELECT usuario_id::text FROM ambulatorio.usuario_aplicacao WHERE ativo AND perfil='administracao' AND usuario_id<>ALL($1::bigint[])", [[ids.adminA, ids.adminB]])).rows;
    await owner.query("UPDATE ambulatorio.usuario_aplicacao SET perfil='consulta' WHERE usuario_id=ANY($1::bigint[])", [existing.map(row => row.usuario_id)]);
    try {
      const a = await token('adminA'); const b = await token('adminB');
      const results = await Promise.all([post(a, 'adminB', body()), http().post(`/v1/usuarios/${ids.adminA}/perfil`).auth(b, { type: 'bearer' }).send({ operacaoId: randomUUID(), versao: '1', perfil: 'consulta', justificativa: 'Despromoção concorrente sintética' })]);
      expect(results.filter(row => row.status === 201)).toHaveLength(1);
      expect(results.filter(row => [401, 403].includes(row.status))).toHaveLength(1);
      expect((await owner.query("SELECT count(*)::int AS n FROM ambulatorio.usuario_aplicacao WHERE ativo AND perfil='administracao'")).rows[0].n).toBe(1);
    } finally {
      await owner.query("UPDATE ambulatorio.usuario_aplicacao SET perfil='administracao',ativo=true WHERE usuario_id=ANY($1::bigint[])", [[ids.adminA, ids.adminB, ...existing.map(row => row.usuario_id)]]);
    }
  });
});
