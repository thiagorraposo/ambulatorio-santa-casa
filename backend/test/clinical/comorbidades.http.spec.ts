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
suite('7B-E3B.2 — comorbidades por atendimento em PostgreSQL descartável', () => {
  let app: INestApplication;
  let owner: Pool;
  let patient: string;
  let other: string;
  let attendance: string;
  let otherAttendance: string;
  let active: string; let second: string; let inactive: string;
  const users: Record<string, string> = {};
  const tokens: Record<string, string> = {};
  const http = () => request(app.getHttpServer());
  const route = (id = attendance, p = patient) => `/v1/pacientes/${p}/atendimentos/${id}/comorbidades`;
  const get = (path: string, perfil = 'edicao') => http().get(path).auth(tokens[perfil], { type: 'bearer' });
  const post = (path: string, body: object, perfil = 'edicao') => http().post(path).auth(tokens[perfil], { type: 'bearer' }).send(body);
  const newAttendance = async () => (await post(`/v1/pacientes/${patient}/atendimentos`, { dataAtendimento: '2026-02-04' }).expect(201)).body.atendimentoId as string;
  const register = async (path: string, body: Record<string, unknown>) => {
    const id = randomUUID();
    await post('/v1/operacoes', { operacaoId: id, metodo: 'POST', caminho: path,
      corpoHash: payloadHash(body) }).expect(201);
    return id;
  };
  const auditCount = async () => Number((await owner.query(`SELECT count(*)::text AS n
    FROM ambulatorio.auditoria_campo_evento e JOIN ambulatorio.auditoria_campo c USING(campo_id)
    WHERE c.tabela_destino IN ('avaliacao_comorbidades','avaliacao_comorbidade_item')`)).rows[0].n);

  beforeAll(async () => {
    const database = process.env.TEST_CLINICAL_DB!;
    if (!/^etapa5_clinical_\d+_\d+$/.test(database)) throw new Error('Banco descartável obrigatório');
    owner = new Pool({ host: process.env.TEST_OWNER_HOST, port: Number(process.env.TEST_OWNER_PORT),
      user: process.env.TEST_OWNER_USER, password: process.env.TEST_OWNER_PASSWORD, database });
    expect((await owner.query('SELECT current_database() AS name')).rows[0].name).toBe(database);
    for (const perfil of ['consulta', 'edicao', 'administracao']) users[perfil] = (await owner.query(`
      INSERT INTO ambulatorio.usuario_aplicacao(nome,login,senha_hash,perfil) VALUES($1,$2,$3,$4)
      RETURNING usuario_id::text`, [`Teste comorbidade ${perfil}`, `comorbidade-${perfil}@example.invalid`,
      '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK', perfil])).rows[0].usuario_id;
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication(); configureApp(app); await app.init();
    for (const perfil of Object.keys(users)) tokens[perfil] = await app.get(JwtService).signAsync({ sub: users[perfil], typ: 'access' });
    patient = (await post('/v1/pacientes', { nome: 'Teste comorbidades A' }, 'administracao').expect(201)).body.pacienteId;
    other = (await post('/v1/pacientes', { nome: 'Teste comorbidades B' }, 'administracao').expect(201)).body.pacienteId;
    for (const perfil of ['consulta', 'edicao']) await http().put(`/v1/pacientes/${patient}/acesso/${users[perfil]}`)
      .auth(tokens.administracao, { type: 'bearer' }).send({ ativo: true, podeEditar: perfil === 'edicao' }).expect(200);
    for (const [nome, ativo] of [['Ativa A sintética', true], ['Ativa B sintética', true], ['Inativa sintética', false]] as const) {
      const id = (await owner.query(`INSERT INTO ambulatorio.comorbidade(nome_comorbidade,ativo) VALUES($1,$2) RETURNING comorbidade_id::text`, [nome, ativo])).rows[0].comorbidade_id;
      if (!ativo) inactive = id; else if (!active) active = id; else second = id;
    }
    attendance = await newAttendance();
    otherAttendance = (await post(`/v1/pacientes/${other}/atendimentos`, { dataAtendimento: '2026-02-02' }, 'administracao').expect(201)).body.atendimentoId;
  });
  afterAll(async () => { await app?.close(); await owner?.end(); });

  const item = (id: string, value: boolean | null) => ({ comorbidadeId: id, possuiComorbidade: value });
  it('mantém ausência, negativa, desconhecido e histórico familiar separados em duas consultas sem alterar legado', async () => {
    const id = await newAttendance(); const otherId = await newAttendance();
    const before = await auditCount();
    expect((await get(route(id)).expect(200)).text).toBe('null');
    expect(await auditCount()).toBe(before);
    const legacy = (await owner.query(`SELECT to_jsonb(p) AS row FROM ambulatorio.paciente_comorbidade p ORDER BY paciente_comorbidade_id`)).rows;
    const body = { itens: [{ ...item(active, false), observacoes: '  Texto\nliteral  ' }, item(second, null)],
      historicoFamiliar: { possuiDoenca: null, descricao: 'Relato livre sintético; exames não interpretados' } };
    const created = (await post(route(id), body).expect(201)).body.avaliacaoComorbidadesId;
    const read = (await get(route(id), 'consulta').expect(200)).body;
    expect(read).toEqual({ avaliacaoComorbidadesId: created, atendimentoId: id,
      itens: [expect.objectContaining({ ...body.itens[0], nomeComorbidade: 'Ativa A sintética' }),
        expect.objectContaining({ ...body.itens[1], observacoes: null, nomeComorbidade: 'Ativa B sintética' })],
      historicoFamiliar: body.historicoFamiliar });
    expect(read.itens.every((row: { itemId: string }) => /^[1-9]\d*$/.test(row.itemId))).toBe(true);
    expect(JSON.stringify(read)).not.toMatch(/valor_original|criado_em|ator_usuario/);
    await post(route(otherId), { itens: [item(active, true)] }).expect(201);
    expect((await get(route(otherId)).expect(200)).body).toMatchObject({ historicoFamiliar: null,
      itens: [{ ...item(active, true), nomeComorbidade: 'Ativa A sintética', observacoes: null }] });
    expect((await get(route(id)).expect(200)).body).toEqual(read);
    expect((await owner.query(`SELECT to_jsonb(p) AS row FROM ambulatorio.paciente_comorbidade p ORDER BY paciente_comorbidade_id`)).rows).toEqual(legacy);
    const events = (await owner.query(`SELECT e.origem,e.ator_usuario_id::text AS ator FROM ambulatorio.auditoria_campo_evento e
      JOIN ambulatorio.auditoria_campo c USING(campo_id) WHERE c.tabela_destino='avaliacao_comorbidades' AND e.registro_id=$1`, [created])).rows;
    expect(events).toHaveLength(3);
    expect(events.every(e => e.origem === 'aplicacao' && e.ator === users.edicao)).toBe(true);
  });
  it('grava apenas histórico familiar, inclusive negativo ou desconhecido sem criar exames/diagnóstico', async () => {
    for (const value of [false, null, true]) {
      const id = await newAttendance();
      const body = { historicoFamiliar: { possuiDoenca: value, descricao: '' } };
      await post(route(id), body).expect(201);
      expect((await get(route(id)).expect(200)).body).toMatchObject({ itens: [], historicoFamiliar: body.historicoFamiliar });
      for (const table of ['diagnostico_chagas','condicao_chagas']) expect((await owner.query(`SELECT count(*)::int n FROM ambulatorio.${table} WHERE atendimento_id=$1`, [id])).rows[0].n).toBe(0);
    }
  });
  it('relê todos os 100 itens contratados sem truncar ou perder nomes e desconhecidos', async () => {
    const id = await newAttendance();
    const catalog = await owner.query<{ id: string }>(`INSERT INTO ambulatorio.comorbidade(nome_comorbidade)
      SELECT 'Catálogo limite sintético '||g FROM generate_series(1,100) g RETURNING comorbidade_id::text AS id`);
    const body = { itens: catalog.rows.map(row => item(row.id, null)) };
    await post(route(id), body).expect(201);
    const read = (await get(route(id)).expect(200)).body;
    expect(read.itens).toHaveLength(100);
    expect(read.itens.map((row: { comorbidadeId: string }) => row.comorbidadeId)).toEqual(catalog.rows.map(row => row.id));
    expect(read.itens.every((row: { possuiComorbidade: boolean | null }) => row.possuiComorbidade === null)).toBe(true);
  });
  it('rejeita DTO incompleto, campos extras, limites e catálogo indisponível sem gravar', async () => {
    const id = await newAttendance();
    const invalid: object[] = [{}, { itens: [] }, { itens: null }, { historicoFamiliar: null },
      { itens: [{ comorbidadeId: active }] }, { historicoFamiliar: {} }, { itens: [null] },
      { itens: [item(active, false), item(active, true)] }, { itens: [item(inactive, true)] },
      { itens: [item('9223372036854775807', false)] }, { itens: [item('9223372036854775808', false)] },
      { itens: [item('01', false)] }, { itens: [{ comorbidadeId: Number(active), possuiComorbidade: true }] },
      { itens: [{ comorbidadeId: active, possuiComorbidade: 'false' }] },
      { historicoFamiliar: { possuiDoenca: 0 } }, { historicoFamiliar: { possuiDoenca: false, descricao: 'x'.repeat(10001) } },
      { itens: [{ ...item(active, false), observacoes: 'x'.repeat(10001) }] },
      { itens: [{ ...item(active, false), pacienteId: patient }] }, { atendimentoId: id, itens: [item(active, true)] },
      { itens: Array.from({ length: 101 }, () => item(active, true)) }];
    for (const body of invalid) await post(route(id), body).expect(400);
    expect((await get(route(id)).expect(200)).text).toBe('null');
    await post(route(id), { itens: [{ ...item(active, null), observacoes: 'x'.repeat(10000) }],
      historicoFamiliar: { possuiDoenca: null, descricao: 'x'.repeat(10000) } }).expect(201);
  });
  it('preserva nome e consulta quando o catálogo muda; recusa seleção inativa futura', async () => {
    const id = await newAttendance(); const next = await newAttendance();
    await post(route(id), { itens: [item(active, true)] }).expect(201);
    const read = (await get(route(id)).expect(200)).body;
    await owner.query(`UPDATE ambulatorio.comorbidade SET ativo=false,nome_comorbidade='Nome posterior sintético' WHERE comorbidade_id=$1`, [active]);
    try {
      expect((await get(route(id)).expect(200)).body).toEqual(read);
      await post(route(next), { itens: [item(active, true)] }).expect(400);
    } finally { await owner.query(`UPDATE ambulatorio.comorbidade SET ativo=true,nome_comorbidade='Ativa A sintética' WHERE comorbidade_id=$1`, [active]); }
  });
  it('autoriza por perfil/vínculo e atendimento correto, inclusive após revogação', async () => {
    await http().get(route()).expect(401); await http().post(route()).send({ itens: [item(active, true)] }).expect(401);
    await post(route(), { itens: [item(active, true)] }, 'consulta').expect(403);
    await get(route(otherAttendance, other)).expect(403);
    await post(route(otherAttendance, other), { itens: [item(active, true)] }).expect(403);
    await get(route(otherAttendance)).expect(404); await post(route(otherAttendance), { itens: [item(active, true)] }).expect(404);
    await get(route('9223372036854775808')).expect(400);
    await post(route(otherAttendance, other), { itens: [item(active, false)] }, 'administracao').expect(201);
    await http().put(`/v1/pacientes/${patient}/acesso/${users.edicao}`).auth(tokens.administracao, { type: 'bearer' }).send({ ativo: false, podeEditar: false }).expect(200);
    try { await get(route()).expect(403); await post(route(), { itens: [item(active, false)] }).expect(403); }
    finally { await http().put(`/v1/pacientes/${patient}/acesso/${users.edicao}`).auth(tokens.administracao, { type: 'bearer' }).send({ ativo: true, podeEditar: true }).expect(200); }
  });
  it('serializa concorrência e devolve 409 sem substituir snapshot', async () => {
    const id = await newAttendance();
    const results = await Promise.all([true, false].map(value => post(route(id), { itens: [item(active, value)] })));
    expect(results.map(result => result.status).sort()).toEqual([201, 409]);
    const read = (await get(route(id)).expect(200)).body;
    await post(route(id), { itens: [item(second, true)] }).expect(409);
    expect((await get(route(id)).expect(200)).body).toEqual(read);
  });
  it('recupera recibo atômico e impede repetir a intenção confirmada', async () => {
    const id = await newAttendance(); const path = route(id); const body = { itens: [item(active, null)], historicoFamiliar: { possuiDoenca: false } };
    const operation = await register(path, body);
    const sent = await http().post(path).auth(tokens.edicao, { type: 'bearer' }).set('X-Operacao-Id', operation).send(body).expect(201);
    expect((await get(`/v1/operacoes/${operation}`).expect(200)).body).toMatchObject({ estado: 'confirmada', resultado: sent.body });
    expect(Object.keys(sent.body)).toEqual(['avaliacaoComorbidadesId']);
    await http().post(path).auth(tokens.edicao, { type: 'bearer' }).set('X-Operacao-Id', operation).send(body).expect(409);
    await get(`/v1/operacoes/${operation}`, 'consulta').expect(404);
  });
  it('reverte cabeçalho, primeiro filho, auditoria e recibo se o segundo filho falha', async () => {
    const id = await newAttendance(); const path = route(id);
    const body = { itens: [item(active, true), { ...item(second, false), observacoes: 'falha_sql_sintetica_comorbidade' }] };
    const operation = await register(path, body); const before = await auditCount();
    await owner.query("ALTER TABLE ambulatorio.avaliacao_comorbidade_item ADD CONSTRAINT comorbidade_teste_rollback CHECK(observacoes IS DISTINCT FROM 'falha_sql_sintetica_comorbidade') NOT VALID");
    try {
      const response = await http().post(path).auth(tokens.edicao, { type: 'bearer' }).set('X-Operacao-Id', operation).send(body).expect(400);
      expect(JSON.stringify(response.body)).not.toMatch(/comorbidade_teste_rollback|23514|INSERT INTO/);
      expect((await get(path).expect(200)).text).toBe('null'); expect(await auditCount()).toBe(before);
      expect((await get(`/v1/operacoes/${operation}`).expect(200)).body).toMatchObject({ estado: 'nao_aplicada', motivo: 'falha' });
    } finally { await owner.query('ALTER TABLE ambulatorio.avaliacao_comorbidade_item DROP CONSTRAINT comorbidade_teste_rollback'); }
  });
});
