import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AuthService } from '../../src/auth/auth.service';
import { configureApp } from '../../src/bootstrap';
import { DatabaseService } from '../../src/common/database/database.service';
import { PacientesService } from '../../src/pacientes/pacientes.service';
import { RecursosClinicosService } from '../../src/pacientes/recursos-clinicos.service';

describe('JSON de recursos clínicos canônicos', () => {
  let app: INestApplication;
  let token: string;
  const treatment = jest.fn().mockResolvedValue(null);
  const notification = jest.fn().mockResolvedValue(null);

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseService).useValue({ query: jest.fn() })
      .overrideProvider(AuthService).useValue({ resolveIdentity: jest.fn().mockResolvedValue({
        usuarioId: '1', nome: 'Profissional sintético', perfil: 'consulta',
      }) })
      .overrideProvider(PacientesService).useValue({ bznTreatment: treatment })
      .overrideProvider(RecursosClinicosService).useValue({ notification }).compile();
    app = module.createNestApplication(); configureApp(app); await app.init();
    token = await app.get(JwtService).signAsync({ sub: '1', typ: 'access' });
  });
  beforeEach(() => jest.clearAllMocks());
  afterAll(async () => app.close());

  it.each(['tratamento-bzn', 'notificacao'])('responde JSON null literal quando %s não existe', async (resource) => {
    const response = await request(app.getHttpServer()).get(`/v1/pacientes/42/${resource}`)
      .auth(token, { type: 'bearer' }).expect(200).expect('Content-Type', /application\/json/);
    expect(response.text).toBe('null');
    expect(response.body).toBeNull();
  });

  it.each(['tratamento-bzn', 'notificacao'])('continua protegendo a ausência de %s com autenticação', async (resource) => {
    await request(app.getHttpServer()).get(`/v1/pacientes/42/${resource}`).expect(401);
    expect(treatment).not.toHaveBeenCalled();
    expect(notification).not.toHaveBeenCalled();
  });

  it('preserva os DTOs JSON quando tratamento ou notificação existem', async () => {
    const existingTreatment = { tratamentoId: '9007199254740993', temIndicacao: null, reacoes: [] };
    const existingNotification = { notificacaoId: '9007199254740995', pacienteNotificado: false,
      numeroNotificacao: null, justificativaNaoNotificacao: 'Texto sintético', observacoes: null };
    treatment.mockResolvedValueOnce(existingTreatment);
    notification.mockResolvedValueOnce(existingNotification);
    await request(app.getHttpServer()).get('/v1/pacientes/42/tratamento-bzn').auth(token, { type: 'bearer' })
      .expect(200).expect('Content-Type', /application\/json/).expect(existingTreatment);
    await request(app.getHttpServer()).get('/v1/pacientes/42/notificacao').auth(token, { type: 'bearer' })
      .expect(200).expect('Content-Type', /application\/json/).expect(existingNotification);
  });
});
