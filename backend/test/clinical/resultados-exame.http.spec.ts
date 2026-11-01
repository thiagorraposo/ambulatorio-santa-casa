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
suite('7B-E6B — Parâmetros do exame canônico em PostgreSQL descartável', () => {
  let app: INestApplication;
  let owner: Pool;
  let patient: string;
  let other: string;
  const users: Record<string, string> = {};
  const tokens: Record<string, string> = {};
  const http = () => request(app.getHttpServer());
  let exam: string;
  let second: string;
  let foreign: string;
  const route = (e = exam, p = patient) => `/v1/pacientes/${p}/exames/${e}/resultados`;
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
    WHERE c.tabela_destino='paciente_exame_resultado'`)).rows[0].n);

  beforeAll(async () => {
    const database = process.env.TEST_CLINICAL_DB!;
    if (!/^etapa5_clinical_\d+_\d+$/.test(database)) throw new Error('Banco descartável obrigatório');
    owner = new Pool({ host: process.env.TEST_OWNER_HOST, port: Number(process.env.TEST_OWNER_PORT),
      user: process.env.TEST_OWNER_USER, password: process.env.TEST_OWNER_PASSWORD, database });
    expect((await owner.query('SELECT current_database() AS name')).rows[0].name).toBe(database);
    for (const perfil of ['consulta', 'edicao', 'administracao']) users[perfil] = (await owner.query(`
      INSERT INTO ambulatorio.usuario_aplicacao(nome,login,senha_hash,perfil) VALUES($1,$2,$3,$4)
      RETURNING usuario_id::text`, [`Teste reação ${perfil}`, `resultados-exame-${perfil}@example.invalid`,
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



  const newExam=async(p=patient)=>{
    const tipo=(await owner.query("SELECT tipo_exame_complementar_id::text AS id FROM ambulatorio.tipo_exame_complementar WHERE codigo_exame='holter'")).rows[0].id;
    const attendance=(await post(`/v1/pacientes/${p}/atendimentos`,{dataAtendimento:'2026-02-01',
      exames:[{tipoExameId:tipo,bloco:'solicitado'}]},'administracao').expect(201)).body.atendimentoId;
    return (await get(`/v1/pacientes/${p}/atendimentos/${attendance}`,'administracao').expect(200)).body.exames[0].exameId as string;
  };
  it('identifica pai canônico, solicitado sem resultado e dois exames independentes',async()=>{
    exam=await newExam();second=await newExam();foreign=await newExam(other);
    const parent=(await get(`/v1/pacientes/${patient}/exames/${exam}`,'consulta').expect(200)).body;
    expect(parent).toMatchObject({exameId:exam,bloco:'solicitado',codigoExame:'holter',resultado:null});
    expect(parent.atendimentoId).toMatch(/^[1-9]\d*$/);
    await get(route(),'consulta').expect(200).expect([]);
    await get(route(second)).expect(200).expect([]);
  });
  it('cria parâmetros concorrentes com IDs próprios, seis campos literais e pai inalterado',async()=>{
    const parent=(await get(`/v1/pacientes/${patient}/exames/${exam}`).expect(200)).body;
    const body={nomeParametro:'  Parâmetro sintético  ',valorInformado:'001,2300 ± relato',unidadeInformada:'Unidade literal',
      referenciaInformada:'Referência humana',interpretacaoInformada:'Texto sem diagnóstico automático',observacoes:'Observação literal'};
    const ids=await Promise.all([1,2].map(async()=>{
      const op=await register(route(),body);
      const response=await http().post(route()).auth(tokens.edicao,{type:'bearer'}).set('X-Operacao-Id',op).send(body).expect(201);
      await http().post(route()).auth(tokens.edicao,{type:'bearer'}).set('X-Operacao-Id',op).send(body).expect(409);
      expect((await get(`/v1/operacoes/${op}`).expect(200)).body).toMatchObject({estado:'confirmada',resultado:response.body});
      return response.body.resultadoId;
    }));
    expect(new Set(ids).size).toBe(2);
    const rows=(await get(route(),'consulta').expect(200)).body;
    expect(rows).toHaveLength(2);expect(rows).toEqual(expect.arrayContaining(ids.map(resultadoId=>({...body,resultadoId,exameId:exam}))));
    expect((await get(`/v1/pacientes/${patient}/exames/${exam}`).expect(200)).body).toEqual(parent);
    await get(route(second)).expect(200).expect([]);
    const events=(await owner.query(`SELECT e.origem,e.ator_usuario_id::text AS ator FROM ambulatorio.auditoria_campo_evento e
      JOIN ambulatorio.auditoria_campo c USING(campo_id) WHERE c.tabela_destino='paciente_exame_resultado'
      AND e.registro_id=ANY($1::bigint[])`,[ids])).rows;
    expect(events).toHaveLength(12);expect(events.every(r=>r.origem==='aplicacao'&&r.ator===users.edicao)).toBe(true);
    expect((await get(`${route()}?limit=1`).expect(200)).body).toHaveLength(1);
    expect((await get(`${route()}?limit=1&offset=1`).expect(200)).body).toHaveLength(1);
    await get(`${route()}?offset=100000`).expect(200).expect([]);
  });
  it('aceita null e exame sem atendimento sem fabricar unidade, resultado ou vínculo',async()=>{
    const tipo=(await owner.query("SELECT tipo_exame_complementar_id::text AS id FROM ambulatorio.tipo_exame_complementar WHERE codigo_exame='holter'")).rows[0].id;
    const id=(await owner.query(`INSERT INTO ambulatorio.paciente_exame_complementar
      (paciente_id,tipo_exame_complementar_id,bloco_origem) VALUES($1,$2,'trazido') RETURNING paciente_exame_complementar_id::text AS id`,[patient,tipo])).rows[0].id;
    await post(route(id),{nomeParametro:'Campo informado',valorInformado:null}).expect(201);
    expect((await get(route(id)).expect(200)).body[0]).toMatchObject({exameId:id,nomeParametro:'Campo informado',valorInformado:null,
      unidadeInformada:null,referenciaInformada:null,interpretacaoInformada:null,observacoes:null});
    expect((await get(`/v1/pacientes/${patient}/exames/${id}`).expect(200)).body.atendimentoId).toBeNull();
    for(const body of [{},{nomeParametro:'   '},{nomeParametro:'X'.repeat(121)},
      {nomeParametro:'Teste',valorInformado:123},{nomeParametro:'Teste',unidadeInformada:'X'.repeat(10001)},
      {nomeParametro:'Teste',exameId:exam}])await post(route(),body).expect(400);
  });
  it('recusa troca de paciente/exame, credenciais, consulta e revogação',async()=>{
    await get(route(foreign)).expect(404);
    await get(route(foreign,other)).expect(403);
    await get(route(exam,other),'administracao').expect(404);
    await post(route(),{nomeParametro:'Não escrever'},'consulta').expect(403);
    await http().get(route()).expect(401);await http().get(route()).auth('invalido',{type:'bearer'}).expect(401);
    for(const id of ['0','abc','9223372036854775808'])await get(route(id)).expect(400);
    for(const q of ['limit=0','offset=-1','ativo=false'])await get(`${route()}?${q}`).expect(400);
    await owner.query('UPDATE ambulatorio.acesso_paciente SET ativo=false WHERE paciente_id=$1 AND usuario_id=$2',[patient,users.consulta]);
    await get(route(),'consulta').expect(403);
  });
  it('reverte parâmetro/captura/recibo em falha SQL, preservando o pai',async()=>{
    const body={nomeParametro:'Falha SQL sintética'};const op=await register(route(),body);
    const before=await auditCount();const rows=(await get(route()).expect(200)).body;
    const parent=(await get(`/v1/pacientes/${patient}/exames/${exam}`).expect(200)).body;
    await owner.query(`ALTER TABLE ambulatorio.paciente_exame_resultado ADD CONSTRAINT resultado_rollback_teste
      CHECK(nome_parametro IS DISTINCT FROM 'Falha SQL sintética') NOT VALID`);
    try{
      const response=await http().post(route()).auth(tokens.edicao,{type:'bearer'}).set('X-Operacao-Id',op).send(body).expect(400);
      expect(JSON.stringify(response.body)).not.toMatch(/resultado_rollback_teste|INSERT|CHECK/);
      expect((await get(route()).expect(200)).body).toEqual(rows);expect(await auditCount()).toBe(before);
      expect((await get(`/v1/operacoes/${op}`).expect(200)).body.estado).toBe('nao_aplicada');
      expect((await get(`/v1/pacientes/${patient}/exames/${exam}`).expect(200)).body).toEqual(parent);
    }finally{await owner.query('ALTER TABLE ambulatorio.paciente_exame_resultado DROP CONSTRAINT resultado_rollback_teste');}
  });
});
