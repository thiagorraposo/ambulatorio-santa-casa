import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';

const suite = process.env.TEST_CLINICAL_DB ? describe : describe.skip;
suite('7B-E2B.2 — complicações por atendimento em PostgreSQL descartável', () => {
  let app: INestApplication;
  let owner: Pool;
  let patient: string;
  let other: string;
  let attendance: string;
  let otherAttendance: string;
  const users: Record<string, string> = {};
  const tokens: Record<string, string> = {};
  const http = () => request(app.getHttpServer());
  const route = (id = attendance, p = patient) => `/v1/pacientes/${p}/atendimentos/${id}/complicacoes-chagas`;
  const get = (path: string, perfil = 'edicao') => http().get(path).auth(tokens[perfil], { type: 'bearer' });
  const post = (path: string, body: object, perfil = 'edicao') => http().post(path).auth(tokens[perfil], { type: 'bearer' }).send(body);
  const newAttendance = async () => (await post(`/v1/pacientes/${patient}/atendimentos`, { dataAtendimento: '2026-02-04' }).expect(201)).body.atendimentoId as string;
  const register = async (path: string, body: Record<string, unknown>) => {
    const id = randomUUID();
    await post('/v1/operacoes', { operacaoId: id, metodo: 'POST', caminho: path,
      corpoHash: createHash('sha256').update(JSON.stringify(body, Object.keys(body).sort())).digest('hex') }).expect(201);
    return id;
  };
  const auditCount = async () => Number((await owner.query(`SELECT count(*)::text AS n
    FROM ambulatorio.auditoria_campo_evento e JOIN ambulatorio.auditoria_campo c USING(campo_id)
    WHERE c.tabela_destino='complicacao_chagas'`)).rows[0].n);

  beforeAll(async () => {
    const database = process.env.TEST_CLINICAL_DB!;
    if (!/^etapa5_clinical_\d+_\d+$/.test(database)) throw new Error('Banco descartável obrigatório');
    owner = new Pool({ host: process.env.TEST_OWNER_HOST, port: Number(process.env.TEST_OWNER_PORT),
      user: process.env.TEST_OWNER_USER, password: process.env.TEST_OWNER_PASSWORD, database });
    expect((await owner.query('SELECT current_database() AS name')).rows[0].name).toBe(database);
    for (const perfil of ['consulta', 'edicao', 'administracao']) users[perfil] = (await owner.query(`
      INSERT INTO ambulatorio.usuario_aplicacao(nome,login,senha_hash,perfil) VALUES($1,$2,$3,$4)
      RETURNING usuario_id::text`, [`Teste complicação ${perfil}`, `complicacao-${perfil}@example.invalid`,
      '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK', perfil])).rows[0].usuario_id;
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication(); configureApp(app); await app.init();
    for (const perfil of Object.keys(users)) tokens[perfil] = await app.get(JwtService).signAsync({ sub: users[perfil], typ: 'access' });
    patient = (await post('/v1/pacientes', { nome: 'Teste complicações A' }, 'administracao').expect(201)).body.pacienteId;
    other = (await post('/v1/pacientes', { nome: 'Teste complicações B' }, 'administracao').expect(201)).body.pacienteId;
    for (const perfil of ['consulta', 'edicao']) await http().put(`/v1/pacientes/${patient}/acesso/${users[perfil]}`)
      .auth(tokens.administracao, { type: 'bearer' }).send({ ativo: true, podeEditar: perfil === 'edicao' }).expect(200);
    attendance = await newAttendance();
    otherAttendance = (await post(`/v1/pacientes/${other}/atendimentos`, { dataAtendimento: '2026-02-02' }, 'administracao').expect(201)).body.atendimentoId;
  });
  afterAll(async () => { await app?.close(); await owner?.end(); });

  it('lê ausência sem criar e preserva quatro campos, repetição e autoria sem inferir condição/diagnóstico', async () => {
    const before = await auditCount();
    expect((await get(route(), 'consulta').expect(200)).body).toEqual([]);
    expect(await auditCount()).toBe(before);
    const body = { tipoComplicacao: 'Tipo livre sintético', possuiComplicacao: false,
      descricao: '  Descrição sintética\nmesmo com presença falsa  ', gravidade: 'grave' };
    const first = (await post(route(), body).expect(201)).body.complicacaoChagasId;
    const second = (await post(route(), body).expect(201)).body.complicacaoChagasId;
    expect(first).toMatch(/^[1-9]\d*$/); expect(second).not.toBe(first);
    const rows = (await get(route(), 'consulta').expect(200)).body;
    expect(rows).toEqual([second, first].map(complicacaoChagasId => ({ ...body, complicacaoChagasId, atendimentoId: attendance })));
    expect(JSON.stringify(rows)).not.toMatch(/valor_original|criado_em|atualizado_em/);
    const audit = await owner.query(`SELECT e.origem,e.ator_usuario_id::text AS ator
      FROM ambulatorio.auditoria_campo_evento e JOIN ambulatorio.auditoria_campo c USING(campo_id)
      WHERE c.tabela_destino='complicacao_chagas' AND e.registro_id=ANY($1::bigint[])`, [[first, second]]);
    expect(audit.rows).toHaveLength(8);
    expect(audit.rows.every(row => row.origem === 'aplicacao' && row.ator === users.edicao)).toBe(true);
    for (const table of ['condicao_chagas', 'diagnostico_chagas']) expect((await owner.query(
      `SELECT count(*)::int n FROM ambulatorio.${table} WHERE atendimento_id=$1`, [attendance])).rows[0].n).toBe(0);
  });

  it('mantém null, false, não informado e texto vazio separados em duas consultas e dois pacientes', async () => {
    const a = await newAttendance(); const b = await newAttendance();
    await post(route(a), { possuiComplicacao: null }).expect(201);
    await post(route(b), { tipoComplicacao: '', possuiComplicacao: false, descricao: ' ', gravidade: 'nao_informado' }).expect(201);
    await post(route(otherAttendance, other), { tipoComplicacao: 'Outro paciente sintético', possuiComplicacao: true }, 'administracao').expect(201);
    expect((await get(route(a)).expect(200)).body).toEqual([expect.objectContaining({ atendimentoId: a,
      tipoComplicacao: null, possuiComplicacao: null, descricao: null, gravidade: null })]);
    expect((await get(route(b)).expect(200)).body).toEqual([expect.objectContaining({ atendimentoId: b,
      tipoComplicacao: '', possuiComplicacao: false, descricao: ' ', gravidade: 'nao_informado' })]);
    expect((await get(route(otherAttendance, other), 'administracao').expect(200)).body).toEqual([
      expect.objectContaining({ atendimentoId: otherAttendance, tipoComplicacao: 'Outro paciente sintético', possuiComplicacao: true })]);
  });

  it('pagina 20/1 pela ordem de registro sem fabricar total ou cronologia clínica', async () => {
    const id = await newAttendance(); const created: string[] = [];
    for (let i = 0; i < 21; i++) created.push((await post(route(id), { tipoComplicacao: 'Tipo repetido sintético', descricao: `Registro ${i}` }).expect(201)).body.complicacaoChagasId);
    const first = (await get(`${route(id)}?limit=20&offset=0`).expect(200)).body;
    const second = (await get(`${route(id)}?limit=20&offset=20`).expect(200)).body;
    expect(first.map((row: { complicacaoChagasId: string }) => row.complicacaoChagasId)).toEqual(created.slice(1).reverse());
    expect(second.map((row: { complicacaoChagasId: string }) => row.complicacaoChagasId)).toEqual([created[0]]);
    expect((await get(`${route(id)}?limit=20&offset=21`).expect(200)).body).toEqual([]);
    for (const query of ['limit=0', 'limit=101', 'offset=-1', 'offset=100001', 'limit=x']) await get(`${route(id)}?${query}`).expect(400);
  });

  it('cria duas ocorrências concorrentes de intenções distintas, inclusive conteúdo igual', async () => {
    const id = await newAttendance(); const path = route(id); const body = { descricao: 'Ocorrência concorrente sintética' };
    const operations = await Promise.all([register(path, body), register(path, body)]);
    const results = await Promise.all(operations.map(operation => http().post(path).auth(tokens.edicao, { type: 'bearer' })
      .set('X-Operacao-Id', operation).send(body)));
    expect(results.map(result => result.status)).toEqual([201, 201]);
    const ids = results.map(result => result.body.complicacaoChagasId);
    expect(new Set(ids).size).toBe(2);
    expect((await get(path).expect(200)).body.map((row: { complicacaoChagasId: string }) => row.complicacaoChagasId)).toEqual(
      [...ids].sort((a, b) => BigInt(a) > BigInt(b) ? -1 : 1));
  });

  it('recusa perfis/vínculos e contexto incorreto, preservando dados durante revogação', async () => {
    await http().get(route()).expect(401); await http().post(route()).send({ possuiComplicacao: false }).expect(401);
    await post(route(), { possuiComplicacao: false }, 'consulta').expect(403);
    await get(route(otherAttendance, other)).expect(403); await post(route(otherAttendance, other), { descricao: 'Recusada' }).expect(403);
    await get(route(otherAttendance)).expect(404); await post(route(otherAttendance), { descricao: 'Recusada' }).expect(404);
    await get(route('9223372036854775808')).expect(400);
    await post(route('0'), { descricao: 'Recusada' }).expect(400);
    const before = (await get(route()).expect(200)).body;
    await http().put(`/v1/pacientes/${patient}/acesso/${users.edicao}`).auth(tokens.administracao, { type: 'bearer' })
      .send({ ativo: false, podeEditar: false }).expect(200);
    try { await get(route()).expect(403); await post(route(), { descricao: 'Recusada' }).expect(403); }
    finally { await http().put(`/v1/pacientes/${patient}/acesso/${users.edicao}`).auth(tokens.administracao, { type: 'bearer' })
      .send({ ativo: true, podeEditar: true }).expect(200); }
    expect((await get(route()).expect(200)).body).toEqual(before);
  });

  it('recusa DTO inválido e campos não contratados sem gravar, aceitando limites exatos', async () => {
    const id = await newAttendance();
    for (const body of [{}, { tipoComplicacao: 'x'.repeat(81) }, { descricao: 'x'.repeat(10001) },
      { possuiComplicacao: 'false' }, { possuiComplicacao: 0 }, { gravidade: 'critica' }, { tipoComplicacao: 1 },
      { valor_original_tipo: 'Não publicar' }, { condicaoChagasId: attendance }, { atendimentoId: id }]) await post(route(id), body).expect(400);
    expect((await get(route(id)).expect(200)).body).toEqual([]);
    const body = { tipoComplicacao: 'x'.repeat(80), descricao: 'x'.repeat(10000), gravidade: 'leve' };
    const created = (await post(route(id), body).expect(201)).body.complicacaoChagasId;
    expect((await get(route(id)).expect(200)).body).toEqual([{ ...body, possuiComplicacao: null, complicacaoChagasId: created, atendimentoId: id }]);
  });

  it('recupera recibo confirmado e recusa reaplicar a mesma intenção sem duplicar episódio', async () => {
    const id = await newAttendance(); const path = route(id); const body = { possuiComplicacao: false, descricao: 'Recibo sintético' };
    const operation = await register(path, body);
    const sent = await http().post(path).auth(tokens.edicao, { type: 'bearer' }).set('X-Operacao-Id', operation).send(body).expect(201);
    const resource = sent.body.complicacaoChagasId;
    expect((await get(`/v1/operacoes/${operation}`).expect(200)).body).toMatchObject({ estado: 'confirmada', resultado: { complicacaoChagasId: resource } });
    await http().post(path).auth(tokens.edicao, { type: 'bearer' }).set('X-Operacao-Id', operation).send(body).expect(409);
    expect((await get(path).expect(200)).body).toEqual([expect.objectContaining({ ...body, complicacaoChagasId: resource })]);
    // Intentions belong to their author: hide another user's UUID, even with patient read access.
    await get(`/v1/operacoes/${operation}`, 'consulta').expect(404);
  });

  it('reverte registro/auditoria na falha SQL e comprova não aplicação da intenção', async () => {
    const id = await newAttendance(); const path = route(id); const body = { descricao: 'recusa_sql_complicacao_sintetica' };
    const operation = await register(path, body); const before = await auditCount();
    await owner.query("ALTER TABLE ambulatorio.complicacao_chagas ADD CONSTRAINT complicacao_teste_rollback CHECK(descricao IS DISTINCT FROM 'recusa_sql_complicacao_sintetica') NOT VALID");
    try {
      const result = await http().post(path).auth(tokens.edicao, { type: 'bearer' }).set('X-Operacao-Id', operation).send(body).expect(400);
      expect(JSON.stringify(result.body)).not.toMatch(/complicacao_teste_rollback|23514|INSERT INTO/);
      expect((await get(path).expect(200)).body).toEqual([]); expect(await auditCount()).toBe(before);
      expect((await get(`/v1/operacoes/${operation}`).expect(200)).body).toMatchObject({ estado: 'nao_aplicada', motivo: 'falha' });
    } finally { await owner.query('ALTER TABLE ambulatorio.complicacao_chagas DROP CONSTRAINT complicacao_teste_rollback'); }
  });
});
