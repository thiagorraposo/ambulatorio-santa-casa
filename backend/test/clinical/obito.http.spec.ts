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
suite('7B-E4B — Óbito consolidado em PostgreSQL descartável', () => {
  let app: INestApplication;
  let owner: Pool;
  let patient: string;
  let other: string;
  const users: Record<string, string> = {};
  const tokens: Record<string, string> = {};
  const http = () => request(app.getHttpServer());
  const route = (id = patient) => `/v1/pacientes/${id}/obito`;
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
    WHERE c.tabela_destino='obito'`)).rows[0].n);

  beforeAll(async () => {
    const database = process.env.TEST_CLINICAL_DB!;
    if (!/^etapa5_clinical_\d+_\d+$/.test(database)) throw new Error('Banco descartável obrigatório');
    owner = new Pool({ host: process.env.TEST_OWNER_HOST, port: Number(process.env.TEST_OWNER_PORT),
      user: process.env.TEST_OWNER_USER, password: process.env.TEST_OWNER_PASSWORD, database });
    expect((await owner.query('SELECT current_database() AS name')).rows[0].name).toBe(database);
    for (const perfil of ['consulta', 'edicao', 'administracao']) users[perfil] = (await owner.query(`
      INSERT INTO ambulatorio.usuario_aplicacao(nome,login,senha_hash,perfil) VALUES($1,$2,$3,$4)
      RETURNING usuario_id::text`, [`Teste dispositivo ${perfil}`, `obito-${perfil}@example.invalid`,
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

  it('lê ausência JSON null e cria estado inicial sem exigir data ou causa',async()=>{
   const before=await auditCount();const absent=await get(route(),'consulta').expect(200);expect(absent.text).toBe('null');expect(await auditCount()).toBe(before);
   const saved=(await post(route(),{houveObito:true}).expect(201)).body;
   expect(saved.obitoId).toMatch(/^[1-9]\d*$/);
   const read=(await get(route(),'consulta').expect(200)).body;
   expect(read).toEqual({obitoId:saved.obitoId,pacienteId:patient,houveObito:true,dataObito:null,causaObito:null,observacoes:null});
   await post(route(),{houveObito:false}).expect(409);expect((await get(route()).expect(200)).body).toEqual(read);
   const e=(await owner.query(`SELECT e.origem,e.ator_usuario_id::text AS ator FROM ambulatorio.auditoria_campo_evento e JOIN ambulatorio.auditoria_campo c USING(campo_id) WHERE c.tabela_destino='obito' AND e.registro_id=$1`,[saved.obitoId])).rows;
   expect(e).toHaveLength(4);expect(e.every(r=>r.origem==='aplicacao'&&r.ator===users.edicao)).toBe(true);
  });
  it('mantém negativa/desconhecido/data/causa independentes sem fabricar atendimento',async()=>{
   const p=await newPatient();const body={houveObito:false,dataObito:'2026-02-01',causaObito:'  Causa literal sintética  ',observacoes:''};
   await post(route(p),body).expect(201);expect((await get(route(p)).expect(200)).body).toMatchObject(body);
   const q=await newPatient();await post(route(q),{houveObito:null}).expect(201);expect((await get(route(q)).expect(200)).body.houveObito).toBeNull();
   expect((await owner.query('SELECT count(*)::int n FROM ambulatorio.atendimento WHERE paciente_id=ANY($1::bigint[])',[[p,q]])).rows[0].n).toBe(0);
  });
  it('recusa datas parciais/inválidas e campos extras sem persistir',async()=>{
   const p=await newPatient();
   for(const body of [{},{dataObito:'2020'},{dataObito:'2026-02-30'},{dataObito:'2026-02-01T00:00:00Z'},{houveObito:'false'},{causaObito:'x'.repeat(10001)},{observacoes:'x'.repeat(10001)},{atendimentoId:'1'}])await post(route(p),body).expect(400);
   expect((await get(route(p)).expect(200)).body).toBeNull();
  });
  it('autoriza por perfil/vínculo e revalida revogação',async()=>{
   await http().get(route()).expect(401);await post(route(),{houveObito:false},'consulta').expect(403);
   await get(route(other)).expect(403);await post(route(other),{houveObito:false}).expect(403);
   await post(route(other),{houveObito:false},'administracao').expect(201);
   await http().put(`/v1/pacientes/${patient}/acesso/${users.edicao}`).auth(tokens.administracao,{type:'bearer'}).send({ativo:false,podeEditar:false}).expect(200);
   try{await get(route()).expect(403);await post(route(),{houveObito:null}).expect(403);}finally{await grant(patient);}
  });
  it('serializa duas intenções de criação e confirma um único estado',async()=>{
   const p=await newPatient();const path=route(p);const body={houveObito:null};const ids=await Promise.all([register(path,body),register(path,body)]);
   const sent=await Promise.all(ids.map(id=>http().post(path).auth(tokens.edicao,{type:'bearer'}).set('X-Operacao-Id',id).send(body)));
   expect(sent.map(r=>r.status).sort()).toEqual([201,409]);const states=await Promise.all(ids.map(id=>get(`/v1/operacoes/${id}`).expect(200)));
   expect(states.map(r=>r.body.estado).sort()).toEqual(['confirmada','nao_aplicada']);
   const winner=ids[sent.findIndex(r=>r.status===201)];expect((await get(`/v1/operacoes/${winner}`).expect(200)).body.resultado).toEqual({obitoId:(await get(path).expect(200)).body.obitoId});
   await http().post(path).auth(tokens.edicao,{type:'bearer'}).set('X-Operacao-Id',winner).send(body).expect(409);
  });
  it('falha SQL reverte estado/captura/recibo e sanitiza detalhes',async()=>{
   const p=await newPatient();const path=route(p);const body={observacoes:'falha_sintetica_obito'};const id=await register(path,body);const before=await auditCount();
   await owner.query("ALTER TABLE ambulatorio.obito ADD CONSTRAINT obito_teste_rollback CHECK(observacoes IS DISTINCT FROM 'falha_sintetica_obito') NOT VALID");
   try{const result=await http().post(path).auth(tokens.edicao,{type:'bearer'}).set('X-Operacao-Id',id).send(body).expect(400);
    expect(JSON.stringify(result.body)).not.toMatch(/23514|obito_teste_rollback|INSERT INTO/);expect(await auditCount()).toBe(before);expect((await get(path).expect(200)).body).toBeNull();
    expect((await get(`/v1/operacoes/${id}`).expect(200)).body).toMatchObject({estado:'nao_aplicada',motivo:'falha'});
   }finally{await owner.query('ALTER TABLE ambulatorio.obito DROP CONSTRAINT obito_teste_rollback');}
  });
});
