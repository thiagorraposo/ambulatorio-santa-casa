import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { compare, hash } from 'bcryptjs';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';

const suite = process.env.TEST_CLINICAL_DB ? describe : describe.skip;
suite('8D2B.3 criação e primeiro acesso PostgreSQL', () => {
  let app: INestApplication; let owner: Pool;
  const ids: Record<string, string> = {}; const tokens: Record<string, string> = {};
  const http = () => request(app.getHttpServer());
  const dto = (login = `criacao-${randomUUID()}@example.invalid`) => ({
    operacaoId: randomUUID(), nome: 'Pessoa sintética criada', login, perfil: 'edicao',
  });
  const create = (input: object = dto()) => http().post('/v1/usuarios').auth(tokens.admin, { type: 'bearer' }).send(input);
  const login = (name: string, senha: string) => http().post('/v1/auth/login').send({ login: name, senha });
  beforeAll(async () => {
    if (!/^etapa5_clinical_\d+_\d+$/.test(process.env.TEST_CLINICAL_DB!)) throw new Error('Banco descartável obrigatório');
    owner = new Pool({ host: process.env.TEST_OWNER_HOST, port: Number(process.env.TEST_OWNER_PORT),
      user: process.env.TEST_OWNER_USER, password: process.env.TEST_OWNER_PASSWORD, database: process.env.TEST_CLINICAL_DB });
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication(); configureApp(app); await app.init();
    const password = await hash('Criacao-sintetica!123', 4);
    for (const name of ['admin', 'consulta', 'edicao']) {
      ids[name] = (await owner.query(`INSERT INTO ambulatorio.usuario_aplicacao(nome,login,senha_hash,perfil)
        VALUES($1,$2,$3,$4) RETURNING usuario_id::text`, [`Criação ${name} sintético`, `criacao-${name}@example.invalid`,
        password, name === 'admin' ? 'administracao' : name])).rows[0].usuario_id;
      tokens[name] = await app.get(JwtService).signAsync({ sub: ids[name], typ: 'access', ver: '0' });
    }
  });
  afterAll(async () => { await app?.close(); await owner?.end(); });

  it('nega anônimo/Consulta/Edição antes de revelar conteúdo e valida campos', async () => {
    await http().post('/v1/usuarios').send(dto()).expect(401);
    for (const name of ['consulta', 'edicao']) {
      await http().post('/v1/usuarios').auth(tokens[name], { type: 'bearer' }).send(dto()).expect(403);
      await http().get(`/v1/usuarios/criacoes/${randomUUID()}`).auth(tokens[name], { type: 'bearer' }).expect(403);
    }
    for (const change of [{ nome: '' }, { nome: 'a'.repeat(161) }, { login: 'com espaço' }, { perfil: 'root' },
      { operacaoId: 'inválido' }, { senha: 'senha-padrao-proibida' }]) {
      await create({ ...dto(), ...change }).expect(400);
    }
  });

  it('cria, relê, recupera recibo e replay sem reexibir credencial ou conferir vínculos', async () => {
    const input = dto(); input.login = input.login.toUpperCase();
    const saved = await create(input).expect(201);
    expect(saved.body.recibo).toMatchObject({ operacaoId: input.operacaoId, atorUsuarioId: ids.admin,
      operacao: 'criacao', resultado: 'aplicada', login: input.login.toLowerCase(), perfil: 'edicao' });
    const credential = saved.body.credencialTemporaria;
    expect(typeof credential === 'string' && credential.length >= 32).toBe(true);
    expect(new Date(saved.body.expiraEm).getTime() - Date.now()).toBeGreaterThan(23 * 3600000);
    const row = (await owner.query('SELECT * FROM ambulatorio.usuario_aplicacao WHERE usuario_id=$1', [saved.body.recibo.usuarioId])).rows[0];
    expect(await compare(credential, row.senha_hash)).toBe(true);
    expect(row.senha_hash.startsWith('$2b$12$')).toBe(true);
    expect(row).toMatchObject({ troca_obrigatoria: true, credencial_consumida_em: null, geracao_sessao: '0' });
    expect((await owner.query('SELECT 1 FROM ambulatorio.acesso_paciente WHERE usuario_id=$1', [row.usuario_id])).rowCount).toBe(0);
    const read = await http().get(`/v1/usuarios/${row.usuario_id}`).auth(tokens.admin, { type: 'bearer' }).expect(200);
    expect(read.body).toMatchObject({ nome: input.nome, login: input.login.toLowerCase(), ativo: true });
    expect(read.body).not.toHaveProperty('senha_hash');
    const receipt = await http().get(`/v1/usuarios/criacoes/${input.operacaoId}`).auth(tokens.admin, { type: 'bearer' }).expect(200);
    expect(receipt.body).toEqual(saved.body.recibo);
    expect(JSON.stringify(receipt.body).includes(credential)).toBe(false);
    const replay = await create(input).expect(201);
    expect(replay.body).toEqual({ recibo: saved.body.recibo });
    await create({ ...input, nome: 'Intenção divergente' }).expect(409);
    const audit = (await owner.query('SELECT payload,recibo FROM ambulatorio.usuario_credencial_operacao WHERE operacao_id=$1', [input.operacaoId])).rows[0];
    expect(JSON.stringify(audit).includes(credential)).toBe(false);
    expect(JSON.stringify(audit)).not.toMatch(/senha_hash|\$2b\$/);
    await http().get(`/v1/usuarios/criacoes/${randomUUID()}`).auth(tokens.admin, { type: 'bearer' }).expect(404);
  });

  it('impõe primeiro acesso, consome temporária uma vez, troca e revoga sessão restrita', async () => {
    const input = dto(); const saved = await create(input).expect(201);
    const temporary = saved.body.credencialTemporaria;
    const initial = await login(input.login, temporary).expect(201);
    expect(initial.body.trocaObrigatoria).toBe(true);
    const auth = initial.body.accessToken;
    await login(input.login, temporary).expect(401);
    await http().get('/v1/auth/me').auth(auth, { type: 'bearer' }).expect(200).expect(response => expect(response.body.trocaObrigatoria).toBe(true));
    await http().get('/v1/pacientes').auth(auth, { type: 'bearer' }).expect(403);
    await http().post('/v1/pacientes').auth(auth, { type: 'bearer' }).send({ nome: 'Não deve existir' }).expect(403);
    await http().post('/v1/auth/senha').auth(auth, { type: 'bearer' }).send({ senhaAtual: temporary, novaSenha: 'fraca' }).expect(400);
    await http().post('/v1/auth/senha').auth(auth, { type: 'bearer' }).send({ senhaAtual: 'Errada-sintetica!123', novaSenha: 'Nova-sintetica!123' }).expect(401);
    await http().post('/v1/auth/senha').auth(auth, { type: 'bearer' }).send({ senhaAtual: temporary, novaSenha: temporary }).expect(400);
    await http().post('/v1/auth/senha').auth(auth, { type: 'bearer' }).send({ senhaAtual: temporary, novaSenha: 'Nova-sintetica!123' }).expect(201, { alterada: true });
    await http().get('/v1/auth/me').auth(auth, { type: 'bearer' }).expect(401);
    const normal = await login(input.login, 'Nova-sintetica!123').expect(201);
    expect(normal.body).not.toHaveProperty('trocaObrigatoria');
    await http().get('/v1/pacientes').auth(normal.body.accessToken, { type: 'bearer' }).expect(200);
    const row = (await owner.query('SELECT troca_obrigatoria,credencial_expira_em,credencial_consumida_em,geracao_sessao::text FROM ambulatorio.usuario_aplicacao WHERE usuario_id=$1', [saved.body.recibo.usuarioId])).rows[0];
    expect(row).toEqual({ troca_obrigatoria: false, credencial_expira_em: null, credencial_consumida_em: null, geracao_sessao: '1' });
    const events = (await owner.query("SELECT recibo FROM ambulatorio.usuario_credencial_operacao WHERE usuario_id=$1 AND recibo->>'operacao'='troca_senha'", [saved.body.recibo.usuarioId])).rows;
    expect(events).toHaveLength(1);
    expect(events[0].recibo).toMatchObject({ atorUsuarioId: saved.body.recibo.usuarioId, resultado: 'aplicada' });
  });

  it('serializa nomes normalizados concorrentes e audita duplicidade sem criar outra conta', async () => {
    const first = dto(); const second = { ...dto(first.login.toUpperCase()), nome: 'Outra pessoa sintética' };
    const outcomes = await Promise.all([create(first), create(second)]);
    expect(outcomes.map(result => result.status).sort()).toEqual([201, 409]);
    expect((await owner.query('SELECT 1 FROM ambulatorio.usuario_aplicacao WHERE login=$1', [first.login])).rowCount).toBe(1);
    const operation = outcomes[0].status === 409 ? first.operacaoId : second.operacaoId;
    const receipt = await http().get(`/v1/usuarios/criacoes/${operation}`).auth(tokens.admin, { type: 'bearer' }).expect(200);
    expect(receipt.body).toMatchObject({ resultado: 'login_duplicado', atorUsuarioId: ids.admin });
    expect(receipt.body).not.toHaveProperty('credencialTemporaria');
  });

  it('aceita apenas um login concorrente com credencial inicial', async () => {
    const input = dto(); const saved = await create(input).expect(201);
    const results = await Promise.all([login(input.login, saved.body.credencialTemporaria), login(input.login, saved.body.credencialTemporaria)]);
    expect(results.map(result => result.status).sort()).toEqual([201, 401]);
  });

  it('recusa credencial expirada e expira também a sessão restrita já emitida', async () => {
    const expiredInput = dto(); const expired = await create(expiredInput).expect(201);
    await owner.query("UPDATE ambulatorio.usuario_aplicacao SET credencial_expira_em=clock_timestamp()-interval '1 second' WHERE usuario_id=$1", [expired.body.recibo.usuarioId]);
    await login(expiredInput.login, expired.body.credencialTemporaria).expect(401);
    const input = dto(); const saved = await create(input).expect(201);
    const initial = await login(input.login, saved.body.credencialTemporaria).expect(201);
    await owner.query("UPDATE ambulatorio.usuario_aplicacao SET credencial_expira_em=clock_timestamp()-interval '1 second' WHERE usuario_id=$1", [saved.body.recibo.usuarioId]);
    await http().get('/v1/auth/me').auth(initial.body.accessToken, { type: 'bearer' }).expect(401);
    await http().post('/v1/auth/senha').auth(initial.body.accessToken, { type: 'bearer' }).send({ senhaAtual: saved.body.credencialTemporaria, novaSenha: 'Nova-sintetica!123' }).expect(401);
  });

  it('recupera conta não administrativa com versão/justificativa, revogação e recibo sem segredo', async () => {
    const path = `/v1/usuarios/${ids.consulta}/credencial`;
    const command = {operacaoId: randomUUID(), versao: '1', justificativa: 'Recuperação sintética autorizada'};
    await http().post(path).auth(tokens.edicao, {type: 'bearer'}).send(command).expect(403);
    await http().post(path).auth(tokens.admin, {type: 'bearer'}).send({...command, justificativa: 'curta'}).expect(400);
    const stale = {...command, operacaoId: randomUUID(), versao: '999'};
    await http().post(path).auth(tokens.admin, {type: 'bearer'}).send(stale).expect(409);
    const refused = await http().get(`/v1/usuarios/credenciais/${stale.operacaoId}`).auth(tokens.admin, {type: 'bearer'}).expect(200);
    expect(refused.body.resultado).toBe('versao_obsoleta');
    await http().get('/v1/auth/me').auth(tokens.consulta, {type: 'bearer'}).expect(200);
    const saved = await http().post(path).auth(tokens.admin, {type: 'bearer'}).send(command).expect(201);
    expect(saved.body.recibo).toMatchObject({operacao: 'recuperacao', resultado: 'aplicada', usuarioId: ids.consulta, atorUsuarioId: ids.admin});
    await http().get('/v1/auth/me').auth(tokens.consulta, {type: 'bearer'}).expect(401);
    const replay = await http().post(path).auth(tokens.admin, {type: 'bearer'}).send(command).expect(201);
    expect(replay.body).toEqual({recibo: saved.body.recibo});
    const receipt = await http().get(`/v1/usuarios/credenciais/${command.operacaoId}`).auth(tokens.admin, {type: 'bearer'}).expect(200);
    expect(receipt.body).toEqual(saved.body.recibo);
    expect(JSON.stringify(receipt.body).includes(saved.body.credencialTemporaria)).toBe(false);
    await login('criacao-consulta@example.invalid', 'Criacao-sintetica!123').expect(401);
    const initial = await login('criacao-consulta@example.invalid', saved.body.credencialTemporaria).expect(201);
    expect(initial.body.trocaObrigatoria).toBe(true);
    await http().get('/v1/pacientes').auth(initial.body.accessToken, {type: 'bearer'}).expect(403);
  });

  it('recusa recuperar administrador, autoação e conta inativa com recibos consultáveis', async () => {
    const admin = await create({...dto(), perfil: 'administracao'}).expect(201);
    const inactive = await create().expect(201);
    await owner.query('UPDATE ambulatorio.usuario_aplicacao SET ativo=false WHERE usuario_id=$1', [inactive.body.recibo.usuarioId]);
    for (const id of [ids.admin, admin.body.recibo.usuarioId, inactive.body.recibo.usuarioId]) {
      const command = {operacaoId: randomUUID(), versao: '1', justificativa: 'Recuperação sintética recusada'};
      await http().post(`/v1/usuarios/${id}/credencial`).auth(tokens.admin, {type: 'bearer'}).send(command).expect(403);
      const receipt = await http().get(`/v1/usuarios/credenciais/${command.operacaoId}`).auth(tokens.admin, {type: 'bearer'}).expect(200);
      expect(receipt.body.resultado).toBe('recuperacao_proibida');
    }
  });


  it('trocas concorrentes com a mesma sessão confirmam uma única senha e evento', async () => {
    const input = dto(); const saved = await create(input).expect(201);
    const initial = await login(input.login, saved.body.credencialTemporaria).expect(201);
    const send = (novaSenha: string) => http().post('/v1/auth/senha').auth(initial.body.accessToken, {type: 'bearer'})
      .send({senhaAtual: saved.body.credencialTemporaria, novaSenha});
    const results = await Promise.all([send('Concorrente-A!123'), send('Concorrente-B!123')]);
    expect(results.map(result => result.status).sort()).toEqual([201, 401]);
    const row = (await owner.query('SELECT senha_hash,geracao_sessao::text FROM ambulatorio.usuario_aplicacao WHERE usuario_id=$1', [saved.body.recibo.usuarioId])).rows[0];
    const a = await compare('Concorrente-A!123', row.senha_hash);
    const b = await compare('Concorrente-B!123', row.senha_hash);
    expect(Number(a) + Number(b)).toBe(1);
    expect(row.geracao_sessao).toBe('1');
    expect((await owner.query("SELECT 1 FROM ambulatorio.usuario_credencial_operacao WHERE usuario_id=$1 AND recibo->>'operacao'='troca_senha'", [saved.body.recibo.usuarioId])).rowCount).toBe(1);
  });

});
