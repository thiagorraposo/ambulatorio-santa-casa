import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AuthService } from '../../src/auth/auth.service';
import { AuthenticatedUser, TokenPayload } from '../../src/auth/auth.types';
import { configureApp } from '../../src/bootstrap';
import { DatabaseService } from '../../src/common/database/database.service';

describe('Contratos HTTP de catálogos', () => {
  let app: INestApplication;
  let jwt: JwtService;
  const tokens: Record<string, string> = {};
  const catalogos = ['exames', 'projetos', 'tipos-encaminhamento'];
  const users: Record<string, AuthenticatedUser> = {
    '1': { usuarioId: '1', nome: 'Consulta sintética', perfil: 'consulta' },
    '2': { usuarioId: '2', nome: 'Edição sintética', perfil: 'edicao' },
    '3': { usuarioId: '3', nome: 'Administração sintética', perfil: 'administracao' },
  };
  const database = { query: jest.fn() };
  const auth = { resolveIdentity: jest.fn(async (payload: TokenPayload) => users[payload.sub]) };
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseService).useValue(database)
      .overrideProvider(AuthService).useValue(auth).compile();
    app = module.createNestApplication(); configureApp(app); await app.init();
    jwt = app.get(JwtService);
    for (const user of Object.values(users)) tokens[user.perfil] = await jwt.signAsync({ sub: user.usuarioId, typ: 'access' });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    database.query.mockResolvedValue({ rows: [{ id: '9007199254740993', codigo: 'sintetico',
      nome: 'Catálogo Sintético', ativo: true }] });
  });

  afterAll(async () => app.close());

  it.each(catalogos)('exige autenticação em %s antes da consulta', async (catalogo) => {
    await http().get(`/v1/catalogos/${catalogo}`).expect(401);
    await http().get(`/v1/catalogos/${catalogo}`).auth('token-invalido', { type: 'bearer' }).expect(401);
    expect(database.query).not.toHaveBeenCalled();
  });

  it.each(catalogos)('permite os três perfis em %s e preserva ID textual', async (catalogo) => {
    for (const perfil of ['consulta', 'edicao', 'administracao']) {
      await http().get(`/v1/catalogos/${catalogo}`).auth(tokens[perfil], { type: 'bearer' }).expect(200)
        .expect([{ id: '9007199254740993', codigo: 'sintetico', nome: 'Catálogo Sintético', ativo: true }]);
    }
    expect(database.query.mock.calls.map((call) => call[1])).toEqual([[20, 0], [20, 0], [20, 0]]);
  });

  it.each(catalogos)('valida a paginação e recusa parâmetros desconhecidos em %s', async (catalogo) => {
    await http().get(`/v1/catalogos/${catalogo}?limit=1&offset=2`)
      .auth(tokens.consulta, { type: 'bearer' }).expect(200);
    expect(database.query).toHaveBeenCalledWith(expect.any(String), [1, 2]);
    database.query.mockClear();
    for (const query of ['limit=0', 'limit=101', 'limit=1.5', 'limit=abc',
      'offset=-1', 'offset=100001', 'offset=1.5', 'ativo=false']) {
      await http().get(`/v1/catalogos/${catalogo}?${query}`).auth(tokens.consulta, { type: 'bearer' }).expect(400);
    }
    expect(database.query).not.toHaveBeenCalled();
  });

  it('recusa identidade inativa, perfil sem autorização e credencial expirada', async () => {
    const unknown = await jwt.signAsync({ sub: '4', typ: 'access' });
    await http().get('/v1/catalogos/exames').auth(unknown, { type: 'bearer' }).expect(401);
    auth.resolveIdentity.mockResolvedValueOnce({ usuarioId: '4', nome: 'Perfil sintético recusado', perfil: 'sem_acesso' } as never);
    await http().get('/v1/catalogos/exames').auth(unknown, { type: 'bearer' }).expect(403);
    const expired = await jwt.signAsync({ sub: '1', typ: 'access' }, { expiresIn: -1 });
    await http().get('/v1/catalogos/exames').auth(expired, { type: 'bearer' }).expect(401);
    expect(database.query).not.toHaveBeenCalled();
  });

  it('retorna lista vazia e sanitiza indisponibilidade sem expor SQL', async () => {
    database.query.mockResolvedValueOnce({ rows: [] });
    await http().get('/v1/catalogos/exames').auth(tokens.consulta, { type: 'bearer' }).expect(200).expect([]);
    database.query.mockRejectedValueOnce(new Error('SELECT metadado_interno FROM tabela_interna'));
    await http().get('/v1/catalogos/exames').auth(tokens.consulta, { type: 'bearer' }).expect(503)
      .expect({ statusCode: 503, error: 'Service Unavailable', message: 'Serviço temporariamente indisponível' });
  });
});
