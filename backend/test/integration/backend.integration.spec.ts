import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';
import { DatabaseService } from '../../src/common/database/database.service';
import { JwtService } from '@nestjs/jwt';

describe('Backend com PostgreSQL real', () => {
  let app: INestApplication;
  let database: DatabaseService;
  let jwt: JwtService;
  let consultaToken: string;
  let edicaoToken: string;
  let administracaoToken: string;

  const login = (loginValue: string, senha: string) => request(app.getHttpServer())
    .post('/auth/login').send({ login: loginValue, senha });

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    database = app.get(DatabaseService);
    jwt = app.get(JwtService);
  });

  afterAll(async () => app.close());

  it('conecta, assume a role limitada e responde ao healthcheck', async () => {
    const identity = await database.query<{ current_user: string; rolsuper: boolean;
      rolcreatedb: boolean; rolcreaterole: boolean }>(
      'SELECT current_user, rolsuper, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname=current_user');
    expect(identity.rows[0]).toEqual({ current_user: 'ambulatorio_aplicacao',
      rolsuper: false, rolcreatedb: false, rolcreaterole: false });
    await request(app.getHttpServer()).get('/health').expect(200)
      .expect({ status: 'ok', database: 'up' });
  });

  it('percorre controller, service, repositório e retorna somente DTO público', async () => {
    const auth = await login(process.env.TEST_LOGIN_CONSULTA!, 'SenhaSintetica123!').expect(201);
    consultaToken = auth.body.accessToken;
    expect(auth.body).toEqual({ accessToken: expect.any(String), tokenType: 'Bearer',
      expiresIn: Number(process.env.AUTH_JWT_EXPIRES_IN_SECONDS) });
    const response = await request(app.getHttpServer()).get('/pacientes?limit=100')
      .set('Authorization', `Bearer ${consultaToken}`).expect(200);
    const patient = response.body.find((item: { nome: string }) => item.nome === 'Paciente Backend Sintético');
    expect(patient).toEqual({ pacienteId: expect.any(String), nome: 'Paciente Backend Sintético' });
    expect(Object.keys(patient).sort()).toEqual(['nome', 'pacienteId']);
  });

  it('diferencia entrada inválida de falha de autenticação sem enumerar conta', async () => {
    await login('x', 'curta').expect(400);
    await request(app.getHttpServer()).post('/auth/login')
      .send({ login: 'valido@example.invalid', senha: 'SenhaSintetica123!', extra: 'proibido' })
      .expect(400);
    const wrong = await login(process.env.TEST_LOGIN_CONSULTA!, 'SenhaIncorreta123!').expect(401);
    const missing = await login('ausente@example.invalid', 'SenhaIncorreta123!').expect(401);
    const inactive = await login(process.env.TEST_LOGIN_INATIVO!, 'SenhaInativa123!').expect(401);
    expect(wrong.body).toEqual(missing.body);
    expect(missing.body).toEqual(inactive.body);
    expect(JSON.stringify(wrong.body)).not.toContain(process.env.TEST_LOGIN_CONSULTA!);
  });

  it('rejeita ausência, token inválido e token expirado com 401', async () => {
    await request(app.getHttpServer()).get('/pacientes').expect(401);
    await request(app.getHttpServer()).get('/pacientes').set('Authorization', 'Bearer invalido').expect(401);
    const expired = await jwt.signAsync({ sub: '1', typ: 'access' }, { expiresIn: -1 });
    await request(app.getHttpServer()).get('/pacientes').set('Authorization', `Bearer ${expired}`).expect(401);
    const wrongAlgorithm = await jwt.signAsync({ sub: '1', typ: 'access' }, { algorithm: 'HS384' });
    await request(app.getHttpServer()).get('/pacientes')
      .set('Authorization', `Bearer ${wrongAlgorithm}`).expect(401);
  });

  it('/auth/me expõe somente identidade autorizada e bloqueia usuário inativado', async () => {
    const response = await request(app.getHttpServer()).get('/auth/me')
      .set('Authorization', `Bearer ${consultaToken}`).expect(200);
    expect(response.body).toEqual({ usuarioId: expect.any(String), nome: 'Consulta Sintetica', perfil: 'consulta' });
    expect(response.body).not.toHaveProperty('login');
    expect(response.body).not.toHaveProperty('senha_hash');
    const inactive = await database.query<{ usuario_id: string }>(
      'SELECT usuario_id::text FROM usuario_aplicacao WHERE login = $1', [process.env.TEST_LOGIN_INATIVO!]);
    const inactiveToken = await jwt.signAsync({ sub: inactive.rows[0].usuario_id, typ: 'access' });
    await request(app.getHttpServer()).get('/auth/me')
      .set('Authorization', `Bearer ${inactiveToken}`).expect(401);
  });

  it('separa autenticação de autorização com 403 e aceita perfil autorizado', async () => {
    await request(app.getHttpServer()).get('/auth/authorization-check')
      .set('Authorization', `Bearer ${consultaToken}`).expect(403);
    const auth = await login(process.env.TEST_LOGIN_EDICAO!, 'SenhaEdicao123!').expect(201);
    edicaoToken = auth.body.accessToken;
    await request(app.getHttpServer()).get('/auth/authorization-check')
      .set('Authorization', `Bearer ${edicaoToken}`).expect(200)
      .expect({ authorized: true, perfil: 'edicao' });
    const adminAuth = await login(process.env.TEST_LOGIN_ADMINISTRACAO!, 'SenhaAdministracao123!').expect(201);
    administracaoToken = adminAuth.body.accessToken;
    await request(app.getHttpServer()).get('/auth/authorization-check')
      .set('Authorization', `Bearer ${administracaoToken}`).expect(200)
      .expect({ authorized: true, perfil: 'administracao' });
  });

  it('limita tentativas excessivas de login sem depender de Redis', async () => {
    let limited = false;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const response = await login('abuso@example.invalid', 'SenhaIncorreta123!');
      if (response.status === 429) { limited = true; break; }
    }
    expect(limited).toBe(true);
  });

  it('mantém perfil funcional separado da role PostgreSQL e bloqueia escalação, DDL e proveniência', async () => {
    await request(app.getHttpServer()).get('/pacientes')
      .set('Authorization', `Bearer ${administracaoToken}`).expect(200);
    const boundaries = await database.query<{
      current_user: string; session_user: string; owns_objects: boolean; can_create_schema: boolean;
      can_set_importer: boolean; can_set_owner: boolean;
    }>(`SELECT current_user, session_user,
      EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='ambulatorio' AND pg_get_userbyid(c.relowner)=current_user) AS owns_objects,
      has_schema_privilege(current_user, 'ambulatorio', 'CREATE') AS can_create_schema,
      pg_has_role(current_user, 'ambulatorio_importador', 'SET') AS can_set_importer,
      pg_has_role(current_user, 'ambulatorio_user', 'SET') AS can_set_owner`);
    expect(boundaries.rows[0]).toMatchObject({
      current_user: 'ambulatorio_aplicacao', session_user: process.env.APP_DB_USER,
      owns_objects: false, can_create_schema: false,
      can_set_importer: false, can_set_owner: false,
    });
    await expect(database.query('CREATE TABLE bloqueio_backend_teste (id integer)')).rejects.toMatchObject({ code: '42501' });
    for (const relation of ['importacao_lote', 'importacao_linha', 'importacao_registro']) {
      await expect(database.query(`SELECT 1 FROM ${relation} LIMIT 1`)).rejects.toMatchObject({ code: '42501' });
    }
  });
});
