import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';

const suite = process.env.TEST_CLINICAL_DB ? describe : describe.skip;
suite('7B-E1B — episódios de sorologia em PostgreSQL descartável', () => {
  let app: INestApplication;
  let owner: Pool;
  let patient: string;
  let other: string;
  let attendance: string;
  let otherAttendance: string;
  const users: Record<string, string> = {};
  const tokens: Record<string, string> = {};
  const http = () => request(app.getHttpServer());
  const route = (id = attendance, p = patient) => `/v1/pacientes/${p}/atendimentos/${id}/sorologias`;
  const authGet = (path: string, perfil = 'edicao') => http().get(path).auth(tokens[perfil], { type: 'bearer' });
  const authPost = (path: string, body: object, perfil = 'edicao') => http().post(path).auth(tokens[perfil], { type: 'bearer' }).send(body);
  const newAttendance = async () => (await authPost(`/v1/pacientes/${patient}/atendimentos`, { dataAtendimento: '2026-02-04' }).expect(201)).body.atendimentoId as string;
  const count = async (table: 'sorologia_chagas' | 'diagnostico_chagas') =>
    Number((await owner.query(`SELECT count(*)::text AS n FROM ambulatorio.${table}`)).rows[0].n);

  beforeAll(async () => {
    const database = process.env.TEST_CLINICAL_DB!;
    if (!/^etapa5_clinical_\d+_\d+$/.test(database)) throw new Error('Banco descartável obrigatório');
    owner = new Pool({ host: process.env.TEST_OWNER_HOST, port: Number(process.env.TEST_OWNER_PORT),
      user: process.env.TEST_OWNER_USER, password: process.env.TEST_OWNER_PASSWORD, database });
    expect((await owner.query('SELECT current_database() AS name')).rows[0].name).toBe(database);
    for (const perfil of ['consulta', 'edicao', 'administracao']) {
      users[perfil] = (await owner.query(`INSERT INTO ambulatorio.usuario_aplicacao(nome,login,senha_hash,perfil)
        VALUES($1,$2,$3,$4) RETURNING usuario_id::text`, [`Teste sorologia ${perfil}`, `sorologia-${perfil}@example.invalid`,
      '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK', perfil])).rows[0].usuario_id;
    }
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication(); configureApp(app); await app.init();
    for (const perfil of Object.keys(users)) tokens[perfil] = await app.get(JwtService).signAsync({ sub: users[perfil], typ: 'access' });
    patient = (await authPost('/v1/pacientes', { nome: 'Teste sorologia A' }, 'administracao').expect(201)).body.pacienteId;
    other = (await authPost('/v1/pacientes', { nome: 'Teste sorologia B' }, 'administracao').expect(201)).body.pacienteId;
    for (const perfil of ['consulta', 'edicao']) await http().put(`/v1/pacientes/${patient}/acesso/${users[perfil]}`)
      .auth(tokens.administracao, { type: 'bearer' }).send({ ativo: true, podeEditar: perfil === 'edicao' }).expect(200);
    attendance = (await authPost(`/v1/pacientes/${patient}/atendimentos`, { dataAtendimento: '2026-02-01',
      diagnosticoChagas: { possuiDiagnosticoChagas: true, resultadoFinal: 'positivo', dataResultadoFinal: '2020-03-01',
        dataDescobertaAutorelato: '2000-05-06' } }).expect(201)).body.atendimentoId;
    otherAttendance = (await authPost(`/v1/pacientes/${other}/atendimentos`, { dataAtendimento: '2026-02-02' }, 'administracao').expect(201)).body.atendimentoId;
  });
  afterAll(async () => { await app?.close(); await owner?.end(); });

  it('mantém episódios e métodos repetidos, pagina e preserva o diagnóstico/descoberta', async () => {
    const original = (await authGet(`/v1/pacientes/${patient}/atendimentos/${attendance}`).expect(200)).body.diagnosticoChagas;
    const first = { metodoSorologico: 'ELISA de teste', dataSolicitacao: '2025-02-01', dataColeta: '2025-02-03',
      dataResultado: '2025-02-07', resultado: 'reagente', laboratorio: 'Laboratório de teste', observacoes: 'Primeiro episódio de teste' };
    const a = (await authPost(route(), first).expect(201)).body.sorologiaId;
    const b = (await authPost(route(), { metodoSorologico: first.metodoSorologico, resultado: null }).expect(201)).body.sorologiaId;
    expect(a).toMatch(/^[1-9]\d*$/); expect(b).toMatch(/^[1-9]\d*$/); expect(a).not.toBe(b);
    const latest = (await authGet(`${route()}?limit=1&offset=0`, 'consulta').expect(200)).body;
    const previous = (await authGet(`${route()}?limit=1&offset=1`).expect(200)).body;
    expect(latest).toHaveLength(1); expect(latest[0]).toMatchObject({ sorologiaId: b, atendimentoId: attendance, resultado: null });
    expect(previous).toHaveLength(1); expect(previous[0]).toMatchObject({ ...first, sorologiaId: a, atendimentoId: attendance });
    expect(JSON.stringify(previous)).not.toMatch(/valor_original|numero_metodo_planilha/);
    expect((await authGet(`/v1/pacientes/${patient}/atendimentos/${attendance}`).expect(200)).body.diagnosticoChagas).toEqual(original);
    const stored = await owner.query('SELECT numero_metodo_planilha FROM ambulatorio.sorologia_chagas WHERE sorologia_chagas_id=ANY($1::bigint[])', [[a, b]]);
    expect(stored.rows).toEqual([{ numero_metodo_planilha: null }, { numero_metodo_planilha: null }]);
    const audit = await owner.query(`SELECT c.coluna_destino,e.origem,e.ator_usuario_id::text AS ator
      FROM ambulatorio.auditoria_campo_evento e JOIN ambulatorio.auditoria_campo c USING(campo_id)
      WHERE c.tabela_destino='sorologia_chagas' AND e.registro_id=$1`, [a]);
    expect(audit.rows).toHaveLength(7);
    expect(audit.rows.every(row => row.origem === 'aplicacao' && row.ator === users.edicao)).toBe(true);
  });

  it('cria uma única âncora null sob concorrência sem inferir diagnóstico ou consolidar métodos', async () => {
    const id = await newAttendance();
    await authGet(route(id)).expect(200).expect([]);
    const results = await Promise.all([
      authPost(route(id), { metodoSorologico: null, resultado: 'nao_informado' }),
      authPost(route(id), { resultado: null }),
    ]);
    expect(results.map(result => result.status)).toEqual([201, 201]);
    const rows = (await authGet(route(id)).expect(200)).body;
    expect(rows).toHaveLength(2);
    expect(rows.map((row: { resultado: string | null }) => row.resultado)).toEqual(expect.arrayContaining([null, 'nao_informado']));
    const anchors = await owner.query(`SELECT possui_diagnostico_chagas,status_diagnostico,resultado_final,
      data_resultado_final,data_descoberta_autorelato FROM ambulatorio.diagnostico_chagas WHERE atendimento_id=$1`, [id]);
    expect(anchors.rows).toEqual([{ possui_diagnostico_chagas: null, status_diagnostico: null, resultado_final: null,
      data_resultado_final: null, data_descoberta_autorelato: null }]);
  });

  it('recusa escrita por consulta, vínculo ausente/revogado e atendimento de outro paciente', async () => {
    const body = { metodoSorologico: 'Método de teste' };
    await http().get(route()).expect(401);
    await http().post(route()).send(body).expect(401);
    await authPost(route(), body, 'consulta').expect(403);
    await authGet(route(otherAttendance, other)).expect(403);
    await authPost(route(otherAttendance, other), body).expect(403);
    await authGet(route(otherAttendance)).expect(404);
    await authPost(route(otherAttendance), body).expect(404);
    await http().put(`/v1/pacientes/${patient}/acesso/${users.edicao}`).auth(tokens.administracao, { type: 'bearer' })
      .send({ ativo: false, podeEditar: false }).expect(200);
    try { await authGet(route()).expect(403); await authPost(route(), body).expect(403); }
    finally { await http().put(`/v1/pacientes/${patient}/acesso/${users.edicao}`).auth(tokens.administracao, { type: 'bearer' })
      .send({ ativo: true, podeEditar: true }).expect(200); }
  });

  it('recusa formato/domínio/limites/campos sem contrato antes de gravar', async () => {
    const before = await count('sorologia_chagas');
    for (const body of [{}, { resultado: 'positivo' }, { dataColeta: '2026-02-30' }, { dataResultado: '2026-02-02T00:00:00Z' },
      { metodoSorologico: 'x'.repeat(121) }, { laboratorio: 'x'.repeat(121) }, { observacoes: 'x'.repeat(10001) },
      { numeroMetodoPlanilha: 1 }, { valor_original_metodo: 'não permitido' }]) await authPost(route(), body).expect(400);
    await authGet(`${route()}?offset=-1`).expect(400);
    await authGet(`${route()}?limit=0`).expect(400);
    expect(await count('sorologia_chagas')).toBe(before);
  });

  it('reverte também a âncora diagnóstica se a inserção do episódio falhar no SQL', async () => {
    const id = await newAttendance();
    const before = await count('diagnostico_chagas');
    const body = { observacoes: 'recusa_sql_de_teste' };
    const operation = randomUUID();
    const hash = createHash('sha256').update(JSON.stringify(body)).digest('hex');
    await authPost('/v1/operacoes', { operacaoId: operation, metodo: 'POST', caminho: route(id), corpoHash: hash }).expect(201);
    await owner.query("ALTER TABLE ambulatorio.sorologia_chagas ADD CONSTRAINT sorologia_teste_rollback CHECK (observacoes IS DISTINCT FROM 'recusa_sql_de_teste') NOT VALID");
    try {
      const result = await http().post(route(id)).auth(tokens.edicao, { type: 'bearer' })
        .set('X-Operacao-Id', operation).send(body).expect(400);
      expect(JSON.stringify(result.body)).not.toMatch(/sorologia_teste_rollback|23514|INSERT INTO/);
      expect(await count('diagnostico_chagas')).toBe(before);
      expect((await owner.query('SELECT count(*)::int AS n FROM ambulatorio.diagnostico_chagas WHERE atendimento_id=$1', [id])).rows[0].n).toBe(0);
      await authGet(route(id)).expect(200).expect([]);
      expect((await authGet(`/v1/operacoes/${operation}`).expect(200)).body).toMatchObject({ estado: 'nao_aplicada', motivo: 'falha' });
    } finally { await owner.query('ALTER TABLE ambulatorio.sorologia_chagas DROP CONSTRAINT sorologia_teste_rollback'); }
  });

  it('confirma recibo consultável e impede reaplicar a mesma intenção', async () => {
    const id = await newAttendance();
    const path = route(id);
    const body = { metodoSorologico: 'Método de correlação de teste', resultado: 'indeterminado' };
    const operation = randomUUID();
    const hash = createHash('sha256').update(JSON.stringify(body, Object.keys(body).sort())).digest('hex');
    await authPost('/v1/operacoes', { operacaoId: operation, metodo: 'POST', caminho: path, corpoHash: hash }).expect(201);
    const sent = await http().post(path).auth(tokens.edicao, { type: 'bearer' }).set('X-Operacao-Id', operation).send(body).expect(201);
    const recovered = (await authGet(`/v1/operacoes/${operation}`).expect(200)).body;
    expect(recovered).toMatchObject({ estado: 'confirmada', resultado: { sorologiaId: sent.body.sorologiaId } });
    await http().post(path).auth(tokens.edicao, { type: 'bearer' }).set('X-Operacao-Id', operation).send(body).expect(409);
    expect((await authGet(path).expect(200)).body).toHaveLength(1);
  });
});
