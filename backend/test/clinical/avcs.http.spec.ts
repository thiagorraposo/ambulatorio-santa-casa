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
suite('7B-E4B — AVC longitudinal em PostgreSQL descartável', () => {
  let app: INestApplication;
  let owner: Pool;
  let patient: string;
  let other: string;
  const users: Record<string, string> = {};
  const tokens: Record<string, string> = {};
  const http = () => request(app.getHttpServer());
  const route = (id = patient) => `/v1/pacientes/${id}/avcs`;
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
    WHERE c.tabela_destino='evento_clinico'`)).rows[0].n);

  beforeAll(async () => {
    const database = process.env.TEST_CLINICAL_DB!;
    if (!/^etapa5_clinical_\d+_\d+$/.test(database)) throw new Error('Banco descartável obrigatório');
    owner = new Pool({ host: process.env.TEST_OWNER_HOST, port: Number(process.env.TEST_OWNER_PORT),
      user: process.env.TEST_OWNER_USER, password: process.env.TEST_OWNER_PASSWORD, database });
    expect((await owner.query('SELECT current_database() AS name')).rows[0].name).toBe(database);
    for (const perfil of ['consulta', 'edicao', 'administracao']) users[perfil] = (await owner.query(`
      INSERT INTO ambulatorio.usuario_aplicacao(nome,login,senha_hash,perfil) VALUES($1,$2,$3,$4)
      RETURNING usuario_id::text`, [`Teste AVC ${perfil}`, `avc-${perfil}@example.invalid`,
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

  it('lê ausência sem criar e preserva quatro campos, repetição e autoria sem fabricar atendimento ou diagnóstico', async () => {
    const before = await auditCount();
    for (const perfil of ['consulta', 'edicao', 'administracao']) expect((await get(route(), perfil).expect(200)).body).toEqual([]);
    expect(await auditCount()).toBe(before);
    const body = { ocorreu: false, anoEvento: 2005, descricao: '  Relato sintético\nmesmo com negativa  ', observacoes: '' };
    const first = (await post(route(), body).expect(201)).body.eventoId;
    const second = (await post(route(), body).expect(201)).body.eventoId;
    expect(first).toMatch(/^[1-9]\d*$/); expect(second).not.toBe(first);
    expect((await get(route(), 'consulta').expect(200)).body).toEqual([second, first].map(eventoId => ({
      ...body, eventoId, pacienteId: patient, tipo: 'avc',
    })));
    const audit = await owner.query(`SELECT c.coluna_destino,e.origem,e.ator_usuario_id::text AS ator,e.versao_campo::int,
      e.antes->>'estado' AS antes FROM ambulatorio.auditoria_campo_evento e
      JOIN ambulatorio.auditoria_campo c USING(campo_id)
      WHERE c.tabela_destino='evento_clinico' AND e.registro_id=ANY($1::bigint[])`, [[first, second]]);
    expect(audit.rows).toHaveLength(10);
    expect(new Set(audit.rows.map(row => row.coluna_destino))).toEqual(new Set(['tipo_evento', 'ocorreu', 'ano_evento', 'descricao', 'observacoes']));
    expect(audit.rows.every(row => row.origem === 'aplicacao' && row.ator === users.edicao
      && row.versao_campo === 1 && row.antes === 'alvo_ausente')).toBe(true);
    expect((await owner.query('SELECT count(*)::int n FROM ambulatorio.atendimento WHERE paciente_id=$1', [patient])).rows[0].n).toBe(0);
    expect(JSON.stringify((await get(route()).expect(200)).body)).not.toMatch(/valor_original|criado_em|atualizado_em|atendimentoId/);
  });

  it('mantém null, false, ano sozinho e textos literais sem apagar histórico ou misturar pacientes/tipos de evento', async () => {
    const id = await newPatient();
    await post(route(id), { ocorreu: true, anoEvento: 1999 }).expect(201);
    await post(route(id), { ocorreu: null }).expect(201);
    await post(route(id), { ocorreu: false, descricao: '', observacoes: ' ' }).expect(201);
    // Limite técnico do ano normalizado, sem acrescentar regra clínica de futuro.
    await post(route(id), { anoEvento: 9999 }).expect(201);
    const annual = (await post(`/v1/pacientes/${id}/ocorrencias-anuais`, { ano: 2020 }).expect(201)).body.eventoId;
    await owner.query(`INSERT INTO ambulatorio.evento_clinico(paciente_id,tipo_evento,ocorreu,descricao)
      VALUES($1,'reacao_adversa',true,'Fixture isolada de tipo não publicado por AVC')`, [id]);
    await post(route(other), { ocorreu: true, descricao: 'Outro paciente' }, 'administracao').expect(201);
    const rows = (await get(route(id)).expect(200)).body;
    expect(rows).toEqual([
      expect.objectContaining({ pacienteId: id, ocorreu: null, anoEvento: 9999, descricao: null, observacoes: null }),
      expect.objectContaining({ pacienteId: id, ocorreu: false, anoEvento: null, descricao: '', observacoes: ' ' }),
      expect.objectContaining({ pacienteId: id, ocorreu: null, anoEvento: null, descricao: null, observacoes: null }),
      expect.objectContaining({ pacienteId: id, ocorreu: true, anoEvento: 1999, descricao: null, observacoes: null }),
    ]);
    expect(rows.every((row: { tipo: string }) => row.tipo === 'avc')).toBe(true);
    expect((await get(`/v1/pacientes/${id}/ocorrencias-anuais`).expect(200)).body).toEqual([
      { eventoId: annual, tipo: 'ultimo_comparecimento_ano_informado', ano: 2020, precisao: 'ano' },
    ]);
    expect((await get(route(other), 'administracao').expect(200)).body).toEqual([
      expect.objectContaining({ pacienteId: other, descricao: 'Outro paciente' }),
    ]);
  });

  it('pagina 20/1 por ID numérico de registro e recusa paginação inválida sem fabricar cronologia', async () => {
    const id = await newPatient(); const created: string[] = [];
    for (let i = 0; i < 21; i++) created.push((await post(route(id), { anoEvento: 2020 - i }).expect(201)).body.eventoId);
    const first = (await get(`${route(id)}?limit=20&offset=0`).expect(200)).body;
    const second = (await get(`${route(id)}?limit=20&offset=20`).expect(200)).body;
    expect(first.map((row: { eventoId: string }) => row.eventoId)).toEqual(created.slice(1).reverse());
    expect(second.map((row: { eventoId: string }) => row.eventoId)).toEqual([created[0]]);
    expect((await get(`${route(id)}?limit=20&offset=21`).expect(200)).body).toEqual([]);
    for (const query of ['limit=0', 'limit=101', 'offset=-1', 'offset=100001', 'limit=x', 'tipo=reacao_adversa']) {
      await get(`${route(id)}?${query}`).expect(400);
    }
  });

  it('registra duas intenções concorrentes iguais como afirmações distintas, sem deduplicação clínica', async () => {
    const id = await newPatient(); const path = route(id); const body = { ocorreu: false, anoEvento: null };
    const operations = await Promise.all([register(path, body), register(path, body)]);
    const results = await Promise.all(operations.map(operation => http().post(path).auth(tokens.edicao, { type: 'bearer' })
      .set('X-Operacao-Id', operation).send(body)));
    expect(results.map(result => result.status)).toEqual([201, 201]);
    const ids = results.map(result => result.body.eventoId);
    expect(new Set(ids).size).toBe(2);
    expect((await get(path).expect(200)).body.map((row: { eventoId: string }) => row.eventoId)).toEqual(
      [...ids].sort((a, b) => BigInt(a) > BigInt(b) ? -1 : 1));
  });

  it('recusa credenciais, perfil, vínculo e IDs inválidos e revalida revogação sem gravar', async () => {
    await http().get(route()).expect(401); await http().post(route()).send({ ocorreu: false }).expect(401);
    await post(route(), { ocorreu: false }, 'consulta').expect(403);
    await get(route(other)).expect(403); await post(route(other), { descricao: 'Recusado' }).expect(403);
    const missing = (await owner.query('SELECT (max(paciente_id)+1)::text AS id FROM ambulatorio.paciente')).rows[0].id;
    await get(route(missing), 'administracao').expect(404);
    await post(route(missing), { ocorreu: true }, 'administracao').expect(404);
    await get(route('9223372036854775808')).expect(400); await post(route('0'), { ocorreu: true }).expect(400);
    const before = (await get(route()).expect(200)).body;
    await http().put(`/v1/pacientes/${patient}/acesso/${users.edicao}`).auth(tokens.administracao, { type: 'bearer' })
      .send({ ativo: false, podeEditar: false }).expect(200);
    try { await get(route()).expect(403); await post(route(), { descricao: 'Recusado' }).expect(403); }
    finally { await grant(patient); }
    expect((await get(route()).expect(200)).body).toEqual(before);
  });

  it('recusa corpo inválido/extra sem persistir e aceita null e limites exatos sem inferir ocorrência', async () => {
    const id = await newPatient();
    for (const body of [{}, { ocorreu: 'false' }, { ocorreu: 0 }, { anoEvento: '2000' }, { anoEvento: 1.5 },
      { anoEvento: -1 }, { anoEvento: 10000 }, { descricao: 1 }, { descricao: 'x'.repeat(10001) },
      { observacoes: 'x'.repeat(10001) }, { tipo: 'reacao_adversa' }, { tipoEvento: 'avc', ocorreu: false },
      { pacienteId: id, ocorreu: true }, { atendimentoId: id, ocorreu: true }, { valor_original_data: '2000' }]) {
      await post(route(id), body).expect(400);
    }
    expect((await get(route(id)).expect(200)).body).toEqual([]);
    await post(route(id), { anoEvento: null }).expect(201);
    const body = { ocorreu: null, anoEvento: 0, descricao: 'x'.repeat(10000), observacoes: 'x'.repeat(10000) };
    const created = (await post(route(id), body).expect(201)).body.eventoId;
    expect((await get(route(id)).expect(200)).body).toEqual([
      { ...body, eventoId: created, pacienteId: id, tipo: 'avc' },
      expect.objectContaining({ ocorreu: null, anoEvento: null, descricao: null, observacoes: null }),
    ]);
  });

  it('recupera recibo confirmado e impede replay da mesma intenção sem duplicar afirmação', async () => {
    const id = await newPatient(); const path = route(id); const body = { ocorreu: false, descricao: 'Recibo AVC sintético' };
    const operation = await register(path, body);
    const sent = await http().post(path).auth(tokens.edicao, { type: 'bearer' }).set('X-Operacao-Id', operation).send(body).expect(201);
    const resource = sent.body.eventoId;
    expect((await get(`/v1/operacoes/${operation}`).expect(200)).body).toMatchObject({ estado: 'confirmada', resultado: { eventoId: resource } });
    await http().post(path).auth(tokens.edicao, { type: 'bearer' }).set('X-Operacao-Id', operation).send(body).expect(409);
    expect((await get(path).expect(200)).body).toEqual([expect.objectContaining({ ...body, eventoId: resource })]);
    await get(`/v1/operacoes/${operation}`, 'consulta').expect(404);
  });

  it('reverte registro, auditoria e recibo na falha SQL e sanitiza o erro', async () => {
    const id = await newPatient(); const path = route(id); const body = { descricao: 'recusa_sql_avc_sintetica' };
    const operation = await register(path, body); const before = await auditCount();
    await owner.query("ALTER TABLE ambulatorio.evento_clinico ADD CONSTRAINT avc_teste_rollback CHECK(descricao IS DISTINCT FROM 'recusa_sql_avc_sintetica') NOT VALID");
    try {
      const result = await http().post(path).auth(tokens.edicao, { type: 'bearer' }).set('X-Operacao-Id', operation).send(body).expect(400);
      expect(JSON.stringify(result.body)).not.toMatch(/avc_teste_rollback|23514|INSERT INTO/);
      expect((await get(path).expect(200)).body).toEqual([]); expect(await auditCount()).toBe(before);
      expect((await get(`/v1/operacoes/${operation}`).expect(200)).body).toMatchObject({ estado: 'nao_aplicada', motivo: 'falha' });
    } finally { await owner.query('ALTER TABLE ambulatorio.evento_clinico DROP CONSTRAINT avc_teste_rollback'); }
  });
});
