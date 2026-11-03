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
suite('7C-E1B E1.2 — Reações BZN em PostgreSQL descartável', () => {
  let app: INestApplication;
  let owner: Pool;
  let patient: string;
  let other: string;
  const users: Record<string, string> = {};
  const tokens: Record<string, string> = {};
  const http = () => request(app.getHttpServer());
  const route = (id = patient) => `/v1/pacientes/${id}/tratamento-bzn/reacoes`;
  const get = (path: string, perfil = 'edicao') => http().get(path).auth(tokens[perfil], { type: 'bearer' });
  const post = (path: string, body: object, perfil = 'edicao') => http().post(path).auth(tokens[perfil], { type: 'bearer' }).send(body);
  const grant = async (id: string) => {
    for (const perfil of ['consulta', 'edicao']) await http().put(`/v1/pacientes/${id}/acesso/${users[perfil]}`)
      .auth(tokens.administracao, { type: 'bearer' }).send({ ativo: true, podeEditar: perfil === 'edicao' }).expect(200);
  };
  const newPatient = async () => {
    const id = (await post('/v1/pacientes', { nome: 'Paciente BZN independente sintético' }, 'administracao').expect(201)).body.pacienteId as string;
    await grant(id); return id;
  };
  const register = async (path: string, body: Record<string, unknown>) => {
    const id = randomUUID();
    await post('/v1/operacoes', { operacaoId: id, metodo: 'POST', caminho: path, corpoHash: payloadHash(body) }).expect(201);
    return id;
  };
  const auditCount = async () => Number((await owner.query(`SELECT count(*)::text AS n
    FROM ambulatorio.auditoria_campo_evento e JOIN ambulatorio.auditoria_campo c USING(campo_id)
    WHERE c.tabela_destino='reacao_adversa_benzonidazol'`)).rows[0].n);

  beforeAll(async () => {
    const database = process.env.TEST_CLINICAL_DB!;
    if (!/^etapa5_clinical_\d+_\d+$/.test(database)) throw new Error('Banco descartável obrigatório');
    owner = new Pool({ host: process.env.TEST_OWNER_HOST, port: Number(process.env.TEST_OWNER_PORT),
      user: process.env.TEST_OWNER_USER, password: process.env.TEST_OWNER_PASSWORD, database });
    expect((await owner.query('SELECT current_database() AS name')).rows[0].name).toBe(database);
    for (const perfil of ['consulta', 'edicao', 'administracao']) users[perfil] = (await owner.query(`
      INSERT INTO ambulatorio.usuario_aplicacao(nome,login,senha_hash,perfil) VALUES($1,$2,$3,$4)
      RETURNING usuario_id::text`, [`Teste reação ${perfil}`, `reacoes-bzn-${perfil}@example.invalid`,
      '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK', perfil])).rows[0].usuario_id;
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication(); configureApp(app); await app.init();
    for (const perfil of Object.keys(users)) tokens[perfil] = await app.get(JwtService).signAsync({ sub: users[perfil], typ: 'access' });
    // Fixture obtém ID disponível fora de Number.MAX_SAFE_INTEGER, sem alterar sequência.
    patient = (await owner.query(`INSERT INTO ambulatorio.paciente(paciente_id,nome)
      SELECT GREATEST(9007199254740993::bigint,COALESCE(max(paciente_id),0)+1),'Paciente BZN bigint sintético'
      FROM ambulatorio.paciente RETURNING paciente_id::text`)).rows[0].paciente_id;
    expect(BigInt(patient)).toBeGreaterThan(BigInt(Number.MAX_SAFE_INTEGER));
    other = (await post('/v1/pacientes', { nome: 'Outro paciente BZN sintético' }, 'administracao').expect(201)).body.pacienteId;
    await grant(patient);
  });
  afterAll(async () => { await app?.close(); await owner?.end(); });


  it('exige tratamento canônico sem criá-lo e diferencia ausência de reação de negativa',async()=>{
    await get(route()).expect(404);
    await post(route(),{descricao:'Não criar pai'}).expect(404);
    await post(`/v1/pacientes/${patient}/tratamento-bzn`,{temIndicacao:null,iniciado:false,teveReacaoAdversa:null}).expect(201);
    await get(route(),'consulta').expect(200).expect([]);
  });
  it('cria duas intenções com IDs distintos, captura cinco campos e preserva pai canônico',async()=>{
    const parent=(await get(`/v1/pacientes/${patient}/tratamento-bzn`).expect(200)).body;
    const {reacoes:ignored,...canonical}=parent;
    const body={descricao:'  Relato literal  ',gravidade:'Texto sem escala',dataReacao:'2026-02-01',
      consequencia:'Consequência literal',observacoes:'Observação literal'};
    const ids=await Promise.all([1,2].map(async()=>{
      const op=await register(route(),body);
      const response=await http().post(route()).auth(tokens.edicao,{type:'bearer'}).set('X-Operacao-Id',op).send(body).expect(201);
      await http().post(route()).auth(tokens.edicao,{type:'bearer'}).set('X-Operacao-Id',op).send(body).expect(409);
      expect((await get(`/v1/operacoes/${op}`).expect(200)).body).toMatchObject({estado:'confirmada',resultado:response.body});
      return response.body.reacaoId;
    }));
    expect(new Set(ids).size).toBe(2);
    const rows=(await get(route(),'consulta').expect(200)).body;
    expect(rows).toHaveLength(2);expect(rows.every((r:{tratamentoId:string})=>r.tratamentoId===parent.tratamentoId)).toBe(true);
    expect(rows).toEqual(expect.arrayContaining(ids.map(reacaoId=>({...body,reacaoId,tratamentoId:parent.tratamentoId}))));
    const audit=(await owner.query(`SELECT e.origem,e.ator_usuario_id::text AS ator FROM ambulatorio.auditoria_campo_evento e
      JOIN ambulatorio.auditoria_campo c USING(campo_id) WHERE c.tabela_destino='reacao_adversa_benzonidazol'
      AND e.registro_id=ANY($1::bigint[])`,[ids])).rows;
    expect(audit).toHaveLength(10);expect(audit.every(r=>r.origem==='aplicacao'&&r.ator===users.edicao)).toBe(true);
    const {reacoes:afterIgnored,...after}=(await get(`/v1/pacientes/${patient}/tratamento-bzn`).expect(200)).body;
    expect(after).toEqual(canonical);
    expect((await get(`${route()}?limit=1`).expect(200)).body).toHaveLength(1);
    expect((await get(`${route()}?limit=1&offset=1`).expect(200)).body).toHaveLength(1);
    await get(`${route()}?offset=100000`).expect(200).expect([]);
  });
  it('preserva nulls e rejeita descrição branca, precisão parcial e campos indevidos',async()=>{
    const response=await post(route(),{descricao:'Outro relato',gravidade:null}).expect(201);
    expect((await get(route()).expect(200)).body[0]).toMatchObject({reacaoId:response.body.reacaoId,
      gravidade:null,dataReacao:null,consequencia:null,observacoes:null});
    for(const body of [{},{descricao:'   '},{descricao:'Teste',dataReacao:'2026'},
      {descricao:'Teste',dataReacao:'2026-02-30'},{descricao:'Teste',gravidade:'a'.repeat(1001)},
      {descricao:'Teste',tratamentoId:'1'}])await post(route(),body).expect(400);
    for(const q of ['limit=0','offset=-1','ativo=false'])await get(`${route()}?${q}`).expect(400);
  });
  it('isola pacientes, consulta não escreve e respeita revogação',async()=>{
    await post(`/v1/pacientes/${other}/tratamento-bzn`,{observacoes:'Outro tratamento'},'administracao').expect(201);
    await get(route(other),'administracao').expect(200).expect([]);
    await get(route(other)).expect(403);
    await post(route(),{descricao:'Consulta'},'consulta').expect(403);
    await http().get(route()).expect(401);
    await http().get(route()).auth('invalido',{type:'bearer'}).expect(401);
    await owner.query('UPDATE ambulatorio.acesso_paciente SET ativo=false WHERE paciente_id=$1 AND usuario_id=$2',[patient,users.consulta]);
    await get(route(),'consulta').expect(403);
  });
  it('reverte ocorrência, captura e recibo na falha SQL com mensagem sanitizada',async()=>{
    const body={descricao:'Falha SQL sintética'};const op=await register(route(),body);const before=await auditCount();
    const count=(await get(route()).expect(200)).body.length;
    await owner.query(`ALTER TABLE ambulatorio.reacao_adversa_benzonidazol ADD CONSTRAINT reacao_rollback_teste
      CHECK(descricao IS DISTINCT FROM 'Falha SQL sintética') NOT VALID`);
    try {
      const response=await http().post(route()).auth(tokens.edicao,{type:'bearer'}).set('X-Operacao-Id',op).send(body).expect(400);
      expect(JSON.stringify(response.body)).not.toMatch(/reacao_rollback_teste|CHECK|INSERT/);
      expect((await get(route()).expect(200)).body).toHaveLength(count);
      expect(await auditCount()).toBe(before);
      expect((await get(`/v1/operacoes/${op}`).expect(200)).body.estado).toBe('nao_aplicada');
    }finally{await owner.query('ALTER TABLE ambulatorio.reacao_adversa_benzonidazol DROP CONSTRAINT reacao_rollback_teste');}
  });
});
