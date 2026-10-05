import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AuthService } from '../../src/auth/auth.service';
import { configureApp } from '../../src/bootstrap';
import { DatabaseService } from '../../src/common/database/database.service';
import { PacientesService } from '../../src/pacientes/pacientes.service';

describe('Validação HTTP de objetos clínicos', () => {
  let app: INestApplication;
  let token: string;
  const service = { create: jest.fn(), update: jest.fn(), createAttendance: jest.fn(), createBznTreatment: jest.fn() };
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseService).useValue({ query: jest.fn() })
      .overrideProvider(AuthService).useValue({ resolveIdentity: jest.fn().mockResolvedValue({
        usuarioId: '1', nome: 'Edição sintética', perfil: 'edicao',
      }) })
      .overrideProvider(PacientesService).useValue(service).compile();
    app = module.createNestApplication(); configureApp(app); await app.init();
    token = await app.get(JwtService).signAsync({ sub: '1', typ: 'access' });
  });
  beforeEach(() => jest.clearAllMocks());
  afterAll(async () => app.close());

  it('recusa arrays de endereço que perderiam seus campos na escrita', async () => {
    const endereco = [{ endereco: 'Rua sintética', cidade: 'Cidade sintética' }];
    await http().post('/v1/pacientes').auth(token, { type: 'bearer' }).send({ nome: 'Paciente sintético', endereco }).expect(400);
    await http().patch('/v1/pacientes/42').auth(token, { type: 'bearer' }).send({ versao: '1', endereco }).expect(400);
    expect(service.create).not.toHaveBeenCalled(); expect(service.update).not.toHaveBeenCalled();
  });

  it.each([
    { dadosClinicos: [{ pesoKg: 70 }] },
    { diagnosticoChagas: [{ dataDescobertaAutorelato: '2020-01-01' }] },
    { rastreioFamiliar: [{ familiaresExaminados: null, familiares: [] }] },
    { exames: [[{ tipoExameId: '1', bloco: 'solicitado' }]] },
    { pendencias: [[{ descricao: 'Pendência sintética' }]] },
    { rastreioFamiliar: { familiaresExaminados: true, familiares: [[{ familiar: 'Familiar sintético', resultado: 'Resultado sintético' }]] } },
  ])('recusa objetos com cardinalidade incompatível: %j', async children => {
    await http().post('/v1/pacientes/42/atendimentos').auth(token, { type: 'bearer' })
      .send({ dataAtendimento: '2020-01-01', ...children }).expect(400);
    expect(service.createAttendance).not.toHaveBeenCalled();
  });

  it('recusa arrays aninhados de reações antes da escrita do BZN', async () => {
    await http().post('/v1/pacientes/42/tratamento-bzn').auth(token, { type: 'bearer' })
      .send({ reacoes: [[{ descricao: 'Reação sintética' }]] }).expect(400);
    expect(service.createBznTreatment).not.toHaveBeenCalled();
  });

  it('preserva valores nulos, false e descoberta separada do resultado no DTO aceito', async () => {
    service.createAttendance.mockResolvedValueOnce({ atendimentoId: '9007199254740993' });
    const dto = { dataAtendimento: '2020-01-01', ambulatorioUnicamente: false, ambulatorioAnexoProjeto: null,
      dadosClinicos: { pesoKg: null, frequenciaCardiacaBpm: 0 },
      diagnosticoChagas: { possuiDiagnosticoChagas: null, dataDescobertaAutorelato: '2010-01-01', dataResultadoFinal: null },
      pendencias: [{ descricao: 'Pendência sintética', status: 'resolvida', dataResolucao: '2020-01-01' }],
      rastreioFamiliar: { familiaresExaminados: null, familiares: [] } };
    await http().post('/v1/pacientes/42/atendimentos').auth(token, { type: 'bearer' }).send(dto)
      .expect(201).expect({ atendimentoId: '9007199254740993' });
    expect(service.createAttendance).toHaveBeenCalledWith(expect.any(Object), '42', expect.objectContaining(dto));
  });
});
