import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';

const suite = process.env.TEST_CLINICAL_DB ? describe : describe.skip;
suite('7B-E2B.1 — condição por atendimento em PostgreSQL descartável', () => {
  let app: INestApplication;
  let owner: Pool;
  let patient: string;
  let other: string;
  let attendance: string;
  let otherAttendance: string;
  const users: Record<string, string> = {};
  const tokens: Record<string, string> = {};
  const http = () => request(app.getHttpServer());
  const route = (id = attendance, p = patient) => `/v1/pacientes/${p}/atendimentos/${id}/condicao-chagas`;
  const authGet = (path: string, perfil = 'edicao') => http().get(path).auth(tokens[perfil], { type: 'bearer' });
  const authPost = (path: string, body: object, perfil = 'edicao') => http().post(path).auth(tokens[perfil], { type: 'bearer' }).send(body);
  const newAttendance = async () => (await authPost(`/v1/pacientes/${patient}/atendimentos`, { dataAtendimento: '2026-02-04' }).expect(201)).body.atendimentoId as string;
  const count = async (table: 'condicao_chagas') =>
    Number((await owner.query(`SELECT count(*)::text AS n FROM ambulatorio.${table}`)).rows[0].n);

  beforeAll(async () => {
    const database = process.env.TEST_CLINICAL_DB!;
    if (!/^etapa5_clinical_\d+_\d+$/.test(database)) throw new Error('Banco descartável obrigatório');
    owner = new Pool({ host: process.env.TEST_OWNER_HOST, port: Number(process.env.TEST_OWNER_PORT),
      user: process.env.TEST_OWNER_USER, password: process.env.TEST_OWNER_PASSWORD, database });
    expect((await owner.query('SELECT current_database() AS name')).rows[0].name).toBe(database);
    for (const perfil of ['consulta', 'edicao', 'administracao']) {
      users[perfil] = (await owner.query(`INSERT INTO ambulatorio.usuario_aplicacao(nome,login,senha_hash,perfil)
        VALUES($1,$2,$3,$4) RETURNING usuario_id::text`, [`Teste condição ${perfil}`, `condicao-${perfil}@example.invalid`,
      '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK', perfil])).rows[0].usuario_id;
    }
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication(); configureApp(app); await app.init();
    for (const perfil of Object.keys(users)) tokens[perfil] = await app.get(JwtService).signAsync({ sub: users[perfil], typ: 'access' });
    patient = (await authPost('/v1/pacientes', { nome: 'Teste condição A' }, 'administracao').expect(201)).body.pacienteId;
    other = (await authPost('/v1/pacientes', { nome: 'Teste condição B' }, 'administracao').expect(201)).body.pacienteId;
    for (const perfil of ['consulta', 'edicao']) await http().put(`/v1/pacientes/${patient}/acesso/${users[perfil]}`)
      .auth(tokens.administracao, { type: 'bearer' }).send({ ativo: true, podeEditar: perfil === 'edicao' }).expect(200);
    attendance = (await authPost(`/v1/pacientes/${patient}/atendimentos`, { dataAtendimento: '2026-02-01',
      diagnosticoChagas: { possuiDiagnosticoChagas: true, resultadoFinal: 'positivo', dataResultadoFinal: '2020-03-01',
        dataDescobertaAutorelato: '2000-05-06' } }).expect(201)).body.atendimentoId;
    otherAttendance = (await authPost(`/v1/pacientes/${other}/atendimentos`, { dataAtendimento: '2026-02-02' }, 'administracao').expect(201)).body.atendimentoId;
  });
  afterAll(async () => { await app?.close(); await owner?.end(); });

  it('consulta ausência como JSON null sem criar e preserva seis campos independentes', async () => {
    const before = await count('condicao_chagas');
    const absent = await authGet(route(), 'consulta').expect(200);
    expect(absent.text).toBe('null'); expect(absent.body).toBeNull();
    expect(await count('condicao_chagas')).toBe(before);
    const diagnosis = (await authGet(`/v1/pacientes/${patient}/atendimentos/${attendance}`).expect(200)).body.diagnosticoChagas;
    const body = { formaClinica: 'cardiodigestiva', faseDoenca: 'aguda', classificacaoClinica: 'Classificação sintética livre',
      possuiSintomas: false, descricaoSintomas: 'Texto sintético preservado apesar do indicador falso', observacoes: '  Observação sintética\nsem normalização  ' };
    const created = (await authPost(route(), body).expect(201)).body;
    expect(created.condicaoChagasId).toMatch(/^[1-9]\d*$/);
    const read = (await authGet(route(), 'consulta').expect(200)).body;
    expect(read).toEqual({ ...body, condicaoChagasId: created.condicaoChagasId, atendimentoId: attendance });
    expect(JSON.stringify(read)).not.toMatch(/valor_original|criado_em|atualizado_em/);
    expect((await authGet(`/v1/pacientes/${patient}/atendimentos/${attendance}`).expect(200)).body.diagnosticoChagas).toEqual(diagnosis);
    const audit = await owner.query(`SELECT e.origem,e.ator_usuario_id::text AS ator FROM ambulatorio.auditoria_campo_evento e
      JOIN ambulatorio.auditoria_campo c USING(campo_id) WHERE c.tabela_destino='condicao_chagas' AND e.registro_id=$1`, [created.condicaoChagasId]);
    expect(audit.rows).toHaveLength(6);
    expect(audit.rows.every(row => row.origem === 'aplicacao' && row.ator === users.edicao)).toBe(true);
    await authPost(route(), { observacoes: 'Não deve sobrescrever' }).expect(409);
    expect((await authGet(route()).expect(200)).body).toEqual(read);
  });

  it('preserva null e não informado em consultas distintas, sem exigir diagnóstico positivo', async () => {
    const a = await newAttendance(); const b = await newAttendance();
    await authPost(route(a), { possuiSintomas: null }).expect(201);
    await authPost(route(b), { formaClinica: 'nao_informado', faseDoenca: 'nao_informado', possuiSintomas: true }).expect(201);
    expect((await authGet(route(a)).expect(200)).body).toMatchObject({ formaClinica: null, faseDoenca: null, possuiSintomas: null });
    expect((await authGet(route(b)).expect(200)).body).toMatchObject({ formaClinica: 'nao_informado', faseDoenca: 'nao_informado', possuiSintomas: true });
    expect((await owner.query('SELECT count(*)::int n FROM ambulatorio.diagnostico_chagas WHERE atendimento_id=ANY($1::bigint[])', [[a,b]])).rows[0].n).toBe(0);
  });

  it('serializa criação concorrente e mantém um único registro sem sobrescrita', async () => {
    const id = await newAttendance();
    const results = await Promise.all([authPost(route(id), { observacoes: 'Primeira condição sintética' }),
      authPost(route(id), { observacoes: 'Segunda condição sintética' })]);
    expect(results.map(r => r.status).sort()).toEqual([201,409]);
    const winner = results.find(r => r.status === 201)!.body.condicaoChagasId;
    expect((await authGet(route(id)).expect(200)).body.condicaoChagasId).toBe(winner);
    expect((await owner.query('SELECT count(*)::int n FROM ambulatorio.condicao_chagas WHERE atendimento_id=$1', [id])).rows[0].n).toBe(1);
  });

  it('recusa consulta sem vínculo, escrita por consulta e contexto de outro paciente', async () => {
    await http().get(route()).expect(401);
    await http().post(route()).send({ possuiSintomas: false }).expect(401);
    await authPost(route(), { possuiSintomas: false }, 'consulta').expect(403);
    await authGet(route(otherAttendance,other)).expect(403);
    await authPost(route(otherAttendance,other), { possuiSintomas: false }).expect(403);
    await authGet(route(otherAttendance)).expect(404);
    await authPost(route(otherAttendance), { possuiSintomas: false }).expect(404);
    await http().put(`/v1/pacientes/${patient}/acesso/${users.edicao}`).auth(tokens.administracao,{type:'bearer'})
      .send({ ativo:false,podeEditar:false }).expect(200);
    try { await authGet(route()).expect(403); await authPost(route(),{observacoes:'Recusada'}).expect(403); }
    finally { await http().put(`/v1/pacientes/${patient}/acesso/${users.edicao}`).auth(tokens.administracao,{type:'bearer'})
      .send({ativo:true,podeEditar:true}).expect(200); }
  });

  it('recusa domínios, tipos, limites e campos não contratados sem gravar', async () => {
    const id = await newAttendance(); const before = await count('condicao_chagas');
    for (const body of [{},{ formaClinica:'positiva' },{ faseDoenca:'indeterminada' },{ possuiSintomas:'false' },
      { classificacaoClinica:'x'.repeat(81) },{ descricaoSintomas:'x'.repeat(10001) },{ observacoes:'x'.repeat(10001) },
      { dispneia:true },{ valor_original_forma_clinica:'não permitido' },{ atendimentoId:id }]) {
      await authPost(route(id),body).expect(400);
    }
    expect(await count('condicao_chagas')).toBe(before);
    expect((await authGet(route(id)).expect(200)).body).toBeNull();
  });

  it('reverte registro e auditoria após falha SQL e mantém recibo conclusivo de não aplicação', async () => {
    const id = await newAttendance(); const path = route(id); const body = { observacoes:'recusa_sql_condicao_sintetica' };
    const operation = randomUUID();
    await authPost('/v1/operacoes',{operacaoId:operation,metodo:'POST',caminho:path,
      corpoHash:createHash('sha256').update(JSON.stringify(body)).digest('hex')}).expect(201);
    const before = await count('condicao_chagas');
    await owner.query("ALTER TABLE ambulatorio.condicao_chagas ADD CONSTRAINT condicao_teste_rollback CHECK(observacoes IS DISTINCT FROM 'recusa_sql_condicao_sintetica') NOT VALID");
    try {
      const result = await http().post(path).auth(tokens.edicao,{type:'bearer'}).set('X-Operacao-Id',operation).send(body).expect(400);
      expect(JSON.stringify(result.body)).not.toMatch(/condicao_teste_rollback|23514|INSERT INTO/);
      expect(await count('condicao_chagas')).toBe(before);
      expect((await authGet(path).expect(200)).body).toBeNull();
      expect((await authGet(`/v1/operacoes/${operation}`).expect(200)).body).toMatchObject({estado:'nao_aplicada',motivo:'falha'});
    } finally { await owner.query('ALTER TABLE ambulatorio.condicao_chagas DROP CONSTRAINT condicao_teste_rollback'); }
  });

  it('recupera recibo após confirmação e recusa reaplicar a intenção ou substituir registro existente', async () => {
    const id = await newAttendance(); const path = route(id); const body = { possuiSintomas:false,observacoes:'Recibo sintético' };
    const operation = randomUUID();
    await authPost('/v1/operacoes',{operacaoId:operation,metodo:'POST',caminho:path,
      corpoHash:createHash('sha256').update(JSON.stringify(body,Object.keys(body).sort())).digest('hex')}).expect(201);
    const sent = await http().post(path).auth(tokens.edicao,{type:'bearer'}).set('X-Operacao-Id',operation).send(body).expect(201);
    expect((await authGet(`/v1/operacoes/${operation}`).expect(200)).body).toMatchObject({estado:'confirmada',resultado:{condicaoChagasId:sent.body.condicaoChagasId}});
    await http().post(path).auth(tokens.edicao,{type:'bearer'}).set('X-Operacao-Id',operation).send(body).expect(409);
    expect((await authGet(path).expect(200)).body).toMatchObject({...body,condicaoChagasId:sent.body.condicaoChagasId});
  });
});
