import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';

const suite = process.env.TEST_CLINICAL_DB ? describe : describe.skip;
suite('8D1B.1 leitura mínima de usuários', () => {
  let app: INestApplication;
  let owner: Pool;
  const tokens: Record<string, string> = {};
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    if (!/^etapa5_clinical_\d+_\d+$/.test(process.env.TEST_CLINICAL_DB!)) throw new Error('Banco descartável obrigatório');
    owner = new Pool({ host: process.env.TEST_OWNER_HOST, port: Number(process.env.TEST_OWNER_PORT),
      user: process.env.TEST_OWNER_USER, password: process.env.TEST_OWNER_PASSWORD, database: process.env.TEST_CLINICAL_DB });
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication(); configureApp(app); await app.init();
    const profiles = ['consulta', 'edicao', 'administracao', 'inativo'];
    for (const [index, profile] of profiles.entries()) {
      const id = String(9007199254741881n + BigInt(index));
      await owner.query(`INSERT INTO ambulatorio.usuario_aplicacao(usuario_id,nome,login,senha_hash,perfil,ativo)
        OVERRIDING SYSTEM VALUE VALUES($1,$2,$3,$4,$5,$6)`, [id, '000 Usuário Homônimo Sintético 8D', `8d-${profile}@example.invalid`,
        '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK', profile === 'inativo' ? 'administracao' : profile, profile !== 'inativo']);
      tokens[profile] = await app.get(JwtService).signAsync({ sub: id, typ: 'access' });
    }
  });
  afterAll(async () => { await app?.close(); await owner?.end(); });

  it('nega anônimo, Consulta, Edição e conta inativa', async () => {
    await http().get('/v1/usuarios').expect(401);
    for (const profile of ['consulta', 'edicao']) {
      const response = await http().get('/v1/usuarios').auth(tokens[profile], { type: 'bearer' }).expect(403);
      expect(JSON.stringify(response.body)).not.toMatch(/000 Usuário|senha|hash|example.invalid/);
    }
    await http().get('/v1/usuarios').auth(tokens.inativo, { type: 'bearer' }).expect(401);
  });
  it('cada perfil consulta somente sua identificação ampliada sem hash ou credencial', async () => {
    await http().get('/v1/auth/me').expect(401);
    await http().get('/v1/auth/me').auth(tokens.inativo, { type: 'bearer' }).expect(401);
    for (const profile of ['consulta', 'edicao', 'administracao']) {
      const expected = (await owner.query(`SELECT usuario_id::text AS "usuarioId",nome,login,perfil,ativo
        FROM ambulatorio.usuario_aplicacao WHERE login=$1`, [`8d-${profile}@example.invalid`])).rows[0];
      const response = await http().get('/v1/auth/me').auth(tokens[profile], { type: 'bearer' }).expect(200);
      expect(response.body).toEqual(expected);
      expect(Object.keys(response.body).sort()).toEqual(['ativo', 'login', 'nome', 'perfil', 'usuarioId']);
    }
  });
  it('projeta ID textual/nome/login/perfil/estado e pagina homônimos sem duplicação', async () => {
    const expected = (await owner.query(`SELECT usuario_id::text AS "usuarioId",nome,perfil,login,ativo
      FROM ambulatorio.usuario_aplicacao ORDER BY nome,usuario_id LIMIT 4`)).rows;
    const first = await http().get('/v1/usuarios?limit=2&offset=0').auth(tokens.administracao, { type: 'bearer' }).expect(200);
    const second = await http().get('/v1/usuarios?limit=2&offset=2').auth(tokens.administracao, { type: 'bearer' }).expect(200);
    expect([...first.body, ...second.body]).toEqual(expected);
    expect(expected.map(row => row.ativo)).toEqual([true, true, true, false]);
    expect(expected.map(row => row.login)).toEqual(['8d-consulta@example.invalid', '8d-edicao@example.invalid', '8d-administracao@example.invalid', '8d-inativo@example.invalid']);
    expect(expected.map(row => row.usuarioId)).toEqual(['9007199254741881', '9007199254741882', '9007199254741883', '9007199254741884']);
    for (const row of [...first.body, ...second.body]) expect(Object.keys(row).sort()).toEqual(['ativo', 'login', 'nome', 'perfil', 'usuarioId']);
    const empty = await http().get('/v1/usuarios?offset=100000').auth(tokens.administracao, { type: 'bearer' }).expect(200);
    expect(empty.body).toEqual([]);
  });
  it.each(['limit=0', 'limit=101', 'offset=-1', 'offset=100001', 'ativo=true', 'perfil=administracao'])('recusa query fora do contrato: %s', async query => {
    await http().get(`/v1/usuarios?${query}`).auth(tokens.administracao, { type: 'bearer' }).expect(400);
  });
  it('consulta conta própria, terceiro e alvo inativo com projeção exata e ID grande', async () => {
    const rows = (await owner.query(`SELECT usuario_id::text AS "usuarioId",nome,perfil,login,ativo
      FROM ambulatorio.usuario_aplicacao WHERE login LIKE '8d-%@example.invalid' ORDER BY usuario_id`)).rows;
    expect(rows).toHaveLength(4);
    for (const row of rows) {
      const response = await http().get(`/v1/usuarios/${row.usuarioId}`).auth(tokens.administracao, { type: 'bearer' }).expect(200);
      expect(response.body).toEqual(row);
      expect(Object.keys(response.body).sort()).toEqual(['ativo', 'login', 'nome', 'perfil', 'usuarioId']);
    }
  });
  it('autoriza antes de revelar existência ou validar ID do detalhe', async () => {
    for (const id of ['9007199254741881', '9223372036854775807', 'invalido']) {
      await http().get(`/v1/usuarios/${id}`).expect(401);
      await http().get(`/v1/usuarios/${id}`).auth(tokens.inativo, { type: 'bearer' }).expect(401);
      for (const profile of ['consulta', 'edicao']) {
        const response = await http().get(`/v1/usuarios/${id}`).auth(tokens[profile], { type: 'bearer' }).expect(403);
        expect(JSON.stringify(response.body)).not.toMatch(/000 Usuário|senha|hash|example.invalid/);
      }
    }
  });
  it.each(['0', '-1', '01', '1.5', 'abc', '9223372036854775808', '99999999999999999999'])('recusa ID inválido no detalhe: %s', async id => {
    await http().get(`/v1/usuarios/${id}`).auth(tokens.administracao, { type: 'bearer' }).expect(400);
  });
  it('distingue inexistente de inválido e recusa query não contratada', async () => {
    await http().get('/v1/usuarios/9223372036854775807').auth(tokens.administracao, { type: 'bearer' }).expect(404);
    for (const query of ['limit=20', 'offset=0', 'ativo=true', 'perfil=consulta']) {
      await http().get(`/v1/usuarios/9007199254741881?${query}`).auth(tokens.administracao, { type: 'bearer' }).expect(400);
    }
  });
  it('revalida o perfil atual e a ativação com o mesmo token', async () => {
    await owner.query("UPDATE ambulatorio.usuario_aplicacao SET perfil='consulta' WHERE usuario_id=$1", ['9007199254741883']);
    await http().get('/v1/usuarios').auth(tokens.administracao, { type: 'bearer' }).expect(403);
    await http().get('/v1/usuarios/9007199254741881').auth(tokens.administracao, { type: 'bearer' }).expect(403);
    await owner.query("UPDATE ambulatorio.usuario_aplicacao SET perfil='administracao',ativo=false WHERE usuario_id=$1", ['9007199254741883']);
    await http().get('/v1/usuarios').auth(tokens.administracao, { type: 'bearer' }).expect(401);
    await http().get('/v1/usuarios/9007199254741881').auth(tokens.administracao, { type: 'bearer' }).expect(401);
  });
});
