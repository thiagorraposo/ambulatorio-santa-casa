import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';

const suite = process.env.TEST_CLINICAL_DB ? describe : describe.skip;
suite('8D2B.1 perfil integrado PostgreSQL', () => {
  let app: INestApplication; let owner: Pool;
  const ids: Record<string, string> = {};
  const http = () => request(app.getHttpServer());
  const token = async (name: string, legacy = false) => {
    const row = (await owner.query('SELECT geracao_sessao::text FROM ambulatorio.usuario_aplicacao WHERE usuario_id=$1', [ids[name]])).rows[0];
    return app.get(JwtService).signAsync({ sub: ids[name], typ: 'access', ...(legacy ? {} : { ver: row.geracao_sessao }) });
  };
  const body = (perfil = 'edicao', versao = '1') => ({ operacaoId: randomUUID(), perfil, versao, justificativa: 'Ajuste sintético autorizado' });
  const post = (auth: string, name: string, dto: object) => http().post(`/v1/usuarios/${ids[name]}/perfil`).auth(auth, { type: 'bearer' }).send(dto);
  beforeAll(async () => {
    if (!/^etapa5_clinical_\d+_\d+$/.test(process.env.TEST_CLINICAL_DB!)) throw new Error('Banco descartável obrigatório');
    owner = new Pool({ host: process.env.TEST_OWNER_HOST, port: Number(process.env.TEST_OWNER_PORT),
      user: process.env.TEST_OWNER_USER, password: process.env.TEST_OWNER_PASSWORD, database: process.env.TEST_CLINICAL_DB });
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication(); configureApp(app); await app.init();
    for (const name of ['adminA', 'adminB', 'consulta', 'edicao', 'alvo', 'inativo', 'corrida']) {
      ids[name] = (await owner.query(`INSERT INTO ambulatorio.usuario_aplicacao(nome,login,senha_hash,perfil,ativo)
        VALUES($1,$2,$3,$4,$5) RETURNING usuario_id::text`, [`Perfil Sintético ${name}`, `perfil-${name.toLowerCase()}@example.invalid`,
        '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK',
        name.startsWith('admin') ? 'administracao' : name === 'edicao' ? 'edicao' : 'consulta', name !== 'inativo'])).rows[0].usuario_id;
    }
  });
  afterAll(async () => { await app?.close(); await owner?.end(); });

  it('nega anônimo, Consulta/Edição e inativo antes de revelar alvo', async () => {
    await http().post('/v1/usuarios/invalido/perfil').send(body()).expect(401);
    for (const name of ['consulta', 'edicao', 'inativo']) {
      const auth = await token(name);
      const status = name === 'inativo' ? 401 : 403;
      await http().post('/v1/usuarios/invalido/perfil').auth(auth, { type: 'bearer' }).send(body()).expect(status);
      await http().get(`/v1/usuarios/${ids.alvo}/operacoes/${randomUUID()}`).auth(auth, { type: 'bearer' }).expect(status);
    }
  });
  it('valida contrato estrito sem criar recibo', async () => {
    const auth = await token('adminA');
    for (const change of [{ perfil: 'root' }, { versao: 1 }, { versao: '01' }, { versao: '9223372036854775808' },
      { justificativa: '  curto  ' }, { justificativa: ' '.repeat(20) }, { justificativa: 'x'.repeat(1001) },
      { operacaoId: 'errado' }, { ativo: false }, { usuarioId: ids.adminA }]) {
      const dto = { ...body(), ...change };
      await post(auth, 'alvo', dto).expect(400);
      if (dto.operacaoId !== 'errado') {
        expect((await owner.query('SELECT count(*)::int AS n FROM ambulatorio.usuario_perfil_operacao WHERE operacao_id=$1', [dto.operacaoId])).rows[0].n).toBe(0);
      }
    }
    await http().post(`/v1/usuarios/${ids.alvo}/perfil?extra=1`).auth(auth, { type: 'bearer' }).send(body()).expect(400);
  });
  it('proíbe autoação, registra recusa e recupera com outro administrador', async () => {
    const dto = body(); await post(await token('adminA'), 'adminA', dto).expect(403);
    const found = await http().get(`/v1/usuarios/${ids.adminA}/operacoes/${dto.operacaoId}`).auth(await token('adminB'), { type: 'bearer' }).expect(200);
    expect(found.body).toMatchObject({ resultado: 'autoacao_proibida', anterior: 'administracao', novo: 'edicao', versaoAnterior: '1', versaoNova: '1', atorUsuarioId: ids.adminA });
  });
  it('altera uma vez, relê versão, audita e recupera após resposta ignorada', async () => {
    const auth = await token('adminA'); const old = await token('alvo', true); const dto = body();
    const saved = await post(auth, 'alvo', dto).expect(201);
    expect(saved.body).toMatchObject({ resultado: 'aplicada', usuarioId: ids.alvo, atorUsuarioId: ids.adminA,
      anterior: 'consulta', novo: 'edicao', versaoAnterior: '1', versaoNova: '2', justificativa: dto.justificativa, operacao: 'perfil' });
    const read = await http().get(`/v1/usuarios/${ids.alvo}`).auth(auth, { type: 'bearer' }).expect(200);
    expect(read.body).toMatchObject({ perfil: 'edicao', versao: '2' });
    await http().get('/v1/auth/me').auth(old, { type: 'bearer' }).expect(401);
    const fresh = await token('alvo');
    const me = await http().get('/v1/auth/me').auth(fresh, { type: 'bearer' }).expect(200);
    expect(me.body.perfil).toBe('edicao'); expect(me.body).not.toHaveProperty('geracao_sessao');
    const replay = await post(auth, 'alvo', dto).expect(201); expect(replay.body).toEqual(saved.body);
    await post(auth, 'alvo', { ...dto, perfil: 'administracao' }).expect(409);
    const receipt = await http().get(`/v1/usuarios/${ids.alvo}/operacoes/${dto.operacaoId}`).auth(await token('adminB'), { type: 'bearer' }).expect(200);
    expect(receipt.body).toEqual(saved.body);
    await post(auth, 'alvo', body('consulta', '2')).expect(201);
    await http().get('/v1/auth/me').auth(old, { type: 'bearer' }).expect(401);
    await http().get('/v1/auth/me').auth(fresh, { type: 'bearer' }).expect(401);
    expect((await owner.query('SELECT count(*)::int AS n FROM ambulatorio.usuario_perfil_operacao WHERE operacao_id=$1', [dto.operacaoId])).rows[0].n).toBe(1);
  });
  it('conflito de duas versões preserva o vencedor e audita a recusa', async () => {
    const auth = await token('adminA'); const left = body('edicao'); const right = body('administracao');
    const responses = await Promise.all([post(auth, 'corrida', left), post(await token('adminB'), 'corrida', right)]);
    expect(responses.map(item => item.status).sort()).toEqual([201, 409]);
    const events = (await owner.query('SELECT recibo FROM ambulatorio.usuario_perfil_operacao WHERE usuario_id=$1', [ids.corrida])).rows;
    expect(events.map(row => row.recibo.resultado).sort()).toEqual(['aplicada', 'versao_obsoleta']);
    expect((await owner.query('SELECT versao_conta::text FROM ambulatorio.usuario_aplicacao WHERE usuario_id=$1', [ids.corrida])).rows[0].versao_conta).toBe('2');
  });
  it('recusa perfil igual e alvo ausente; recibo inexistente não comprova rollback', async () => {
    const auth = await token('adminA');
    await post(auth, 'consulta', body('consulta')).expect(409);
    const dto = body();
    await http().post('/v1/usuarios/9223372036854775807/perfil').auth(auth, { type: 'bearer' }).send(dto).expect(404);
    await http().get(`/v1/usuarios/${ids.alvo}/operacoes/${dto.operacaoId}`).auth(auth, { type: 'bearer' }).expect(404);
    await http().get(`/v1/usuarios/${ids.alvo}/operacoes/${randomUUID()}`).auth(auth, { type: 'bearer' }).expect(404);
    await http().get(`/v1/usuarios/${ids.alvo}/operacoes/invalido`).auth(auth, { type: 'bearer' }).expect(400);
  });
  it('protege último administrador em UPDATEs concorrentes de infraestrutura', async () => {
    const existing = (await owner.query("SELECT usuario_id::text FROM ambulatorio.usuario_aplicacao WHERE ativo AND perfil='administracao'")).rows;
    await owner.query("UPDATE ambulatorio.usuario_aplicacao SET perfil='administracao' WHERE usuario_id=ANY($1::bigint[])", [[ids.adminA, ids.adminB]]);
    await owner.query("UPDATE ambulatorio.usuario_aplicacao SET perfil='consulta' WHERE perfil='administracao' AND usuario_id<>ALL($1::bigint[])", [[ids.adminA, ids.adminB]]);
    try {
      const attempts = await Promise.allSettled([
        owner.query("UPDATE ambulatorio.usuario_aplicacao SET perfil='consulta' WHERE usuario_id=$1", [ids.adminA]),
        owner.query('UPDATE ambulatorio.usuario_aplicacao SET ativo=false WHERE usuario_id=$1', [ids.adminB]),
      ]);
      expect(attempts.filter(item => item.status === 'fulfilled')).toHaveLength(1);
      expect(attempts.filter(item => item.status === 'rejected')).toEqual([expect.objectContaining({ reason: expect.objectContaining({ code: '23514' }) })]);
      expect((await owner.query("SELECT count(*)::int AS n FROM ambulatorio.usuario_aplicacao WHERE ativo AND perfil='administracao'")).rows[0].n).toBe(1);
      const connection = await owner.connect();
      try {
        await connection.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
        await expect(connection.query("UPDATE ambulatorio.usuario_aplicacao SET nome=nome WHERE usuario_id=$1", [ids.consulta])).rejects.toMatchObject({ code: '25000' });
      } finally { await connection.query('ROLLBACK'); connection.release(); }
    } finally {
      await owner.query("UPDATE ambulatorio.usuario_aplicacao SET perfil='administracao',ativo=true WHERE usuario_id=ANY($1::bigint[])", [[ids.adminA, ids.adminB, ...existing.map(row => row.usuario_id)]]);
    }
  });
  it('duas despromoções cruzadas não removem os dois administradores e revogam a sessão perdedora', async () => {
    // Isolar os dois administradores sem alterar contas de outros arquivos de teste.
    const existing = (await owner.query("SELECT usuario_id::text,perfil FROM ambulatorio.usuario_aplicacao WHERE perfil='administracao' AND usuario_id<>ALL($1::bigint[])", [[ids.adminA, ids.adminB]])).rows;
    await owner.query("UPDATE ambulatorio.usuario_aplicacao SET perfil='consulta' WHERE perfil='administracao' AND usuario_id<>ALL($1::bigint[])", [[ids.adminA, ids.adminB]]);
    try {
    const a = await token('adminA'); const b = await token('adminB');
    const version = async (name: string) => (await owner.query('SELECT versao_conta::text FROM ambulatorio.usuario_aplicacao WHERE usuario_id=$1', [ids[name]])).rows[0].versao_conta;
    const [va, vb] = await Promise.all([version('adminA'), version('adminB')]);
    const responses = await Promise.all([post(a, 'adminB', body('consulta', vb)), post(b, 'adminA', body('consulta', va))]);
    expect(responses.map(item => item.status).sort()).toEqual([201, 403]);
    const admins = (await owner.query("SELECT usuario_id::text FROM ambulatorio.usuario_aplicacao WHERE ativo AND perfil='administracao'")).rows;
    expect(admins).toHaveLength(1);
    const loserToken = admins[0].usuario_id === ids.adminA ? b : a;
    await http().get('/v1/usuarios').auth(loserToken, { type: 'bearer' }).expect(401);
    await expect(owner.query("UPDATE ambulatorio.usuario_aplicacao SET perfil='edicao' WHERE usuario_id=$1", [admins[0].usuario_id])).rejects.toMatchObject({ code: '23514' });
    await expect(owner.query('UPDATE ambulatorio.usuario_aplicacao SET ativo=false WHERE usuario_id=$1', [admins[0].usuario_id])).rejects.toMatchObject({ code: '23514' });
    } finally {
      await owner.query("UPDATE ambulatorio.usuario_aplicacao SET perfil='administracao' WHERE usuario_id=ANY($1::bigint[])", [[ids.adminA, ids.adminB, ...existing.map(row => row.usuario_id)]]);
    }
  });
});
