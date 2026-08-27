import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';
import { DatabaseService } from '../../src/common/database/database.service';

describe('Backend com PostgreSQL real', () => {
  let app: INestApplication;
  let database: DatabaseService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    database = app.get(DatabaseService);
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
    const response = await request(app.getHttpServer()).get('/pacientes?limit=100').expect(200);
    const patient = response.body.find((item: { nome: string }) => item.nome === 'Paciente Backend Sintético');
    expect(patient).toEqual({ pacienteId: expect.any(String), nome: 'Paciente Backend Sintético' });
    expect(Object.keys(patient).sort()).toEqual(['nome', 'pacienteId']);
  });

  it('bloqueia DDL e acesso à proveniência bruta', async () => {
    await expect(database.query('CREATE TABLE bloqueio_backend_teste (id integer)')).rejects.toMatchObject({ code: '42501' });
    await expect(database.query('SELECT dados_brutos FROM importacao_linha LIMIT 1')).rejects.toMatchObject({ code: '42501' });
  });
});
