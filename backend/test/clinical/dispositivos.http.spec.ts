import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';
import { payloadHash } from '../../src/operacoes/operacoes.contract';

const suite = process.env.TEST_CLINICAL_DB ? describe : describe.skip;
suite('7B-E4B — Dispositivos consolidados em PostgreSQL descartável', () => {
  let app: INestApplication;
  let owner: Pool;
  let patient: string;
  let other: string;
  const users: Record<string, string> = {};
  const tokens: Record<string, string> = {};
  const http = () => request(app.getHttpServer());
  const route = (id = patient) => `/v1/pacientes/${id}/dispositivos`;
  const get = (path: string, perfil = 'edicao') => http().get(path).auth(tokens[perfil], { type: 'bearer' });
  const post = (path: string, body: object, perfil = 'edicao') => http().post(path).auth(tokens[perfil], { type: 'bearer' }).send(body);
  const grant = async (id: string) => {
    for (const perfil of ['consulta', 'edicao']) await http().put(`/v1/pacientes/${id}/acesso/${users[perfil]}`)
      .auth(tokens.administracao, { type: 'bearer' }).send({ ativo: true, podeEditar: perfil === 'edicao' }).expect(200);
  };
  const newPatient = async () => {
    const id = (await post('/v1/pacientes', { nome: 'Paciente AVC independente sintético' }, 'administracao').expect(201)).body.pacienteId as string;
    await grant(id); return id;
  };
  const register = async (path: string, body: Record<string, unknown>) => {
    const id = randomUUID();
    await post('/v1/operacoes', { operacaoId: id, metodo: 'POST', caminho: path, corpoHash: payloadHash(body) }).expect(201);
    return id;
  };
  const auditCount = async () => Number((await owner.query(`SELECT count(*)::text AS n
    FROM ambulatorio.auditoria_campo_evento e JOIN ambulatorio.auditoria_campo c USING(campo_id)
    WHERE c.tabela_destino='dispositivo_implantado'`)).rows[0].n);

  beforeAll(async () => {
    const database = process.env.TEST_CLINICAL_DB!;
    if (!/^etapa5_clinical_\d+_\d+$/.test(database)) throw new Error('Banco descartável obrigatório');
    owner = new Pool({ host: process.env.TEST_OWNER_HOST, port: Number(process.env.TEST_OWNER_PORT),
      user: process.env.TEST_OWNER_USER, password: process.env.TEST_OWNER_PASSWORD, database });
    expect((await owner.query('SELECT current_database() AS name')).rows[0].name).toBe(database);
    for (const perfil of ['consulta', 'edicao', 'administracao']) users[perfil] = (await owner.query(`
      INSERT INTO ambulatorio.usuario_aplicacao(nome,login,senha_hash,perfil) VALUES($1,$2,$3,$4)
      RETURNING usuario_id::text`, [`Teste dispositivo ${perfil}`, `dispositivo-${perfil}@example.invalid`,
      '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK', perfil])).rows[0].usuario_id;
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication(); configureApp(app); await app.init();
    for (const perfil of Object.keys(users)) tokens[perfil] = await app.get(JwtService).signAsync({ sub: users[perfil], typ: 'access' });
    // Fixture obtém ID disponível fora de Number.MAX_SAFE_INTEGER, sem alterar sequência.
    patient = (await owner.query(`INSERT INTO ambulatorio.paciente(paciente_id,nome)
      SELECT GREATEST(9007199254740993::bigint,COALESCE(max(paciente_id),0)+1),'Paciente AVC bigint sintético'
      FROM ambulatorio.paciente RETURNING paciente_id::text`)).rows[0].paciente_id;
    expect(BigInt(patient)).toBeGreaterThan(BigInt(Number.MAX_SAFE_INTEGER));
    other = (await post('/v1/pacientes', { nome: 'Outro paciente AVC sintético' }, 'administracao').expect(201)).body.pacienteId;
    await grant(patient);
  });
  afterAll(async () => { await app?.close(); await owner?.end(); });

  it('cria estado inicial triestado e observações literais sem atualizar registro existente', async () => {
    expect((await get(route(), 'consulta').expect(200)).body).toEqual([]);
    const body = { tipoDispositivo: 'marcapasso', possuiDispositivo: false, observacoes: '  Estado sintético  ' };
    const id = (await post(route(), body).expect(201)).body.dispositivoId;
    expect(id).toMatch(/^[1-9]\d*$/);
    await post(route(), { tipoDispositivo: 'cdi', possuiDispositivo: null }).expect(201);
    const rows = (await get(route(), 'consulta').expect(200)).body;
    expect(rows).toEqual([expect.objectContaining({ tipoDispositivo: 'cdi', possuiDispositivo: null, observacoes: null }), { ...body, dispositivoId: id, pacienteId: patient }]);
    await post(route(), { ...body, possuiDispositivo: true }).expect(409);
    expect((await get(route()).expect(200)).body).toEqual(rows);
    const events = (await owner.query(`SELECT e.origem,e.ator_usuario_id::text AS ator FROM ambulatorio.auditoria_campo_evento e JOIN ambulatorio.auditoria_campo c USING(campo_id) WHERE c.tabela_destino='dispositivo_implantado' AND e.registro_id=$1`, [id])).rows;
    expect(events).toHaveLength(3); expect(events.every(r => r.origem === 'aplicacao' && r.ator === users.edicao)).toBe(true);
  });
  it('recusa entrada inválida e tipo não aprovado sem inferir resincronizador', async () => {
    for (const body of [{}, { tipoDispositivo: 'resincronizador' }, { tipoDispositivo: 'outro' },
      { tipoDispositivo: 'cdi', possuiDispositivo: 'false' }, { tipoDispositivo: 'cdi', observacoes: 'x'.repeat(10001) },
      { tipoDispositivo: 'cdi', atendimentoId: '1' }]) await post(route(), body).expect(400);
  });
  it('isola pacientes, recusa perfis/vínculo e valida paginação', async () => {
    await http().get(route()).expect(401); await post(route(), { tipoDispositivo: 'cdi' }, 'consulta').expect(403);
    await get(route(other)).expect(403); await post(route(other), { tipoDispositivo: 'cdi' }).expect(403);
    await post(route(other), { tipoDispositivo: 'cdi', possuiDispositivo: true }, 'administracao').expect(201);
    expect((await get(route(other), 'administracao').expect(200)).body).toHaveLength(1);
    expect((await get(`${route()}?limit=1&offset=1`).expect(200)).body).toHaveLength(1);
    await get(`${route()}?limit=0`).expect(400);
    await get(route('9223372036854775808')).expect(400);
  });
  it('duas intenções concorrentes do mesmo tipo não substituem o estado consolidado', async () => {
    const p = await newPatient(); const path = route(p);
    const body = { tipoDispositivo: 'marcapasso', possuiDispositivo: true };
    const operations = await Promise.all([register(path, body), register(path, body)]);
    const responses = await Promise.all(operations.map(id => http().post(path).auth(tokens.edicao, { type:'bearer' }).set('X-Operacao-Id', id).send(body)));
    expect(responses.map(r=>r.status).sort()).toEqual([201,409]);
    expect((await get(path).expect(200)).body).toHaveLength(1);
    const states = await Promise.all(operations.map(id=>get(`/v1/operacoes/${id}`).expect(200)));
    expect(states.map(r=>r.body.estado).sort()).toEqual(['confirmada','nao_aplicada']);
  });
  it('recupera recibo e reverte registro/auditoria/recibo na falha SQL', async () => {
    const p = (await post('/v1/pacientes', { nome: 'Recibo dispositivo sintético' }, 'administracao').expect(201)).body.pacienteId;
    for (const profile of ['consulta','edicao']) await http().put(`/v1/pacientes/${p}/acesso/${users[profile]}`).auth(tokens.administracao,{type:'bearer'}).send({ ativo:true,podeEditar:profile==='edicao' }).expect(200);
    const path = route(p); const body = { tipoDispositivo: 'cdi', possuiDispositivo: false };
    const operation = await register(path, body);
    const saved = await http().post(path).auth(tokens.edicao,{type:'bearer'}).set('X-Operacao-Id', operation).send(body).expect(201);
    expect((await get(`/v1/operacoes/${operation}`).expect(200)).body).toMatchObject({ estado:'confirmada',resultado:saved.body });
    await http().post(path).auth(tokens.edicao,{type:'bearer'}).set('X-Operacao-Id', operation).send(body).expect(409);
    const failedBody = { tipoDispositivo:'marcapasso',observacoes:'falha_sintetica_dispositivo' };
    const failed = await register(path, failedBody); const before = await auditCount();
    await owner.query("ALTER TABLE ambulatorio.dispositivo_implantado ADD CONSTRAINT dispositivo_teste_rollback CHECK(observacoes IS DISTINCT FROM 'falha_sintetica_dispositivo') NOT VALID");
    try {
      const result = await http().post(path).auth(tokens.edicao,{type:'bearer'}).set('X-Operacao-Id',failed).send(failedBody).expect(400);
      expect(JSON.stringify(result.body)).not.toMatch(/23514|dispositivo_teste_rollback|INSERT INTO/);
      expect(await auditCount()).toBe(before);
      expect((await get(`/v1/operacoes/${failed}`).expect(200)).body).toMatchObject({ estado:'nao_aplicada',motivo:'falha' });
      expect((await get(path).expect(200)).body).toHaveLength(1);
    } finally { await owner.query('ALTER TABLE ambulatorio.dispositivo_implantado DROP CONSTRAINT dispositivo_teste_rollback'); }
  });
});
