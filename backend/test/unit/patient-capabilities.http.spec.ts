import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AuthService } from '../../src/auth/auth.service';
import { AuthenticatedUser, TokenPayload } from '../../src/auth/auth.types';
import { configureApp } from '../../src/bootstrap';
import { DatabaseService } from '../../src/common/database/database.service';
import { ClinicalAccessService } from '../../src/common/security/clinical-access.service';
import { AppConfig } from '../../src/config/app.config';

describe('Capacidade de cadastro HTTP', () => {
  let app: INestApplication;
  let policy: AppConfig['clinical']['accessPolicy'];
  const tokens: Record<string, string> = {};
  const users: Record<string, AuthenticatedUser> = {
    '1': { usuarioId: '1', nome: 'Consulta sintética', perfil: 'consulta' },
    '2': { usuarioId: '2', nome: 'Edição sintética', perfil: 'edicao' },
    '3': { usuarioId: '3', nome: 'Administração sintética', perfil: 'administracao' },
  };
  const query = jest.fn(async (_sql: string, values: string[]) => ({ rows: [{ perfil: users[values[0]].perfil }] }));
  const database = { transaction: jest.fn(async (operation: (tx: unknown) => Promise<unknown>) => operation({ query })) };
  const auth = { resolveIdentity: jest.fn(async (payload: TokenPayload) => users[payload.sub]) };
  const access = new ClinicalAccessService({ get: () => ({ accessPolicy: policy }) } as never);
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseService).useValue(database)
      .overrideProvider(AuthService).useValue(auth)
      .overrideProvider(ClinicalAccessService).useValue(access).compile();
    app = module.createNestApplication(); configureApp(app); await app.init();
    for (const user of Object.values(users)) tokens[user.perfil] = await app.get(JwtService)
      .signAsync({ sub: user.usuarioId, typ: 'access' });
  });
  beforeEach(() => { jest.clearAllMocks(); policy = 'vinculo_explicito'; });
  afterAll(async () => app.close());

  it('exige autenticação antes de consultar capacidade', async () => {
    await http().get('/v1/pacientes/capacidades').expect(401);
    await http().get('/v1/pacientes/capacidades').auth('invalido', { type: 'bearer' }).expect(401);
    expect(database.transaction).not.toHaveBeenCalled();
  });

  it.each([
    ['vinculo_explicito', 'consulta', false], ['vinculo_explicito', 'edicao', false],
    ['vinculo_explicito', 'administracao', true], ['todos_sinteticos', 'consulta', false],
    ['todos_sinteticos', 'edicao', true], ['todos_sinteticos', 'administracao', true],
  ] as const)('reflete a política %s para %s sem consultar pacientes', async (configured, perfil, podeCadastrar) => {
    policy = configured;
    await http().get('/v1/pacientes/capacidades').auth(tokens[perfil], { type: 'bearer' })
      .expect(200).expect({ podeCadastrar });
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('usuario_aplicacao'),
      [Object.values(users).find(user => user.perfil === perfil)!.usuarioId]);
  });

  it('recusa identidade inativa e perfil alterado entre guard e consulta', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    await http().get('/v1/pacientes/capacidades').auth(tokens.edicao, { type: 'bearer' }).expect(401);
    query.mockResolvedValueOnce({ rows: [{ perfil: 'consulta' }] });
    await http().get('/v1/pacientes/capacidades').auth(tokens.edicao, { type: 'bearer' }).expect(401);
  });

  it('trata política desabilitada e indisponibilidade sem anunciar capacidade', async () => {
    policy = 'desabilitada';
    await http().get('/v1/pacientes/capacidades').auth(tokens.administracao, { type: 'bearer' }).expect(503);
    expect(query).not.toHaveBeenCalled();
    policy = 'vinculo_explicito';
    query.mockRejectedValueOnce(new Error('SELECT dado_interno FROM tabela_interna'));
    const response = await http().get('/v1/pacientes/capacidades').auth(tokens.administracao, { type: 'bearer' }).expect(503);
    expect(response.body.message).toBe('Serviço temporariamente indisponível');
    expect(JSON.stringify(response.body)).not.toContain('dado_interno');
  });
});
