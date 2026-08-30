import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';
import { DatabaseService } from '../../src/common/database/database.service';

describe('Aplicação', () => {
  let app: INestApplication;
  const database = { query: jest.fn() };

  beforeAll(async () => {
    Object.assign(process.env, {
      NODE_ENV: 'test', API_PORT: '3000', APP_DB_HOST: 'localhost', APP_DB_PORT: '5432',
      APP_DB_NAME: 'db', APP_DB_USER: 'login', APP_DB_PASSWORD: 'synthetic',
      APP_DB_ROLE: 'ambulatorio_aplicacao',
      AUTH_JWT_SECRET: 'segredo-sintetico-com-mais-de-trinta-e-dois-caracteres',
      AUTH_JWT_EXPIRES_IN_SECONDS: '900',
    });
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseService).useValue(database).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => app.close());

  it('inicializa e responde ao healthcheck', async () => {
    database.query.mockResolvedValueOnce({ rows: [{ ready: 1 }] });
    await request(app.getHttpServer()).get('/health').expect(200)
      .expect({ status: 'ok', database: 'up' });
  });

  it('protege endpoint de negócio por padrão', async () => {
    await request(app.getHttpServer()).get('/pacientes?limit=0').expect(401)
      .expect(({ body }) => expect(body).toMatchObject({ statusCode: 401, error: 'Unauthorized' }));
  });

  it('sanitiza falha de banco na resposta HTTP', async () => {
    database.query.mockRejectedValueOnce(new Error('password=secret SELECT * FROM paciente'));
    await request(app.getHttpServer()).get('/health').expect(503)
      .expect(({ body }) => {
        expect(body).toEqual({ statusCode: 503, error: 'Service Unavailable',
          message: 'Banco de dados indisponível' });
        expect(JSON.stringify(body)).not.toContain('password');
        expect(JSON.stringify(body)).not.toContain('SELECT');
      });
  });
});
