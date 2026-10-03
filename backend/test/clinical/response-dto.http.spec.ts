import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';

const suite = process.env.TEST_CLINICAL_DB ? describe : describe.skip;

suite('DTOs clínicos HTTP no banco descartável', () => {
  let app: INestApplication;
  let owner: Pool;
  let patientId: string;
  const ids: Record<string, string> = {};
  const tokens: Record<string, string> = {};
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    if (!/^etapa5_clinical_\d+_\d+$/.test(process.env.TEST_CLINICAL_DB!)) throw new Error('Banco descartável obrigatório');
    owner = new Pool({ host: process.env.TEST_OWNER_HOST, port: Number(process.env.TEST_OWNER_PORT),
      user: process.env.TEST_OWNER_USER, password: process.env.TEST_OWNER_PASSWORD, database: process.env.TEST_CLINICAL_DB });
    for (const perfil of ['consulta', 'edicao', 'administracao']) {
      const result = await owner.query(`INSERT INTO ambulatorio.usuario_aplicacao(nome,login,senha_hash,perfil)
        VALUES($1,$2,$3,$4) RETURNING usuario_id::text`, [perfil, `dto-${perfil}@example.invalid`,
        '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK', perfil]);
      ids[perfil] = result.rows[0].usuario_id;
    }
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication(); configureApp(app); await app.init();
    for (const perfil of Object.keys(ids)) tokens[perfil] = await app.get(JwtService).signAsync({ sub: ids[perfil], typ: 'access' });
    patientId = (await http().post('/pacientes').auth(tokens.administracao, { type: 'bearer' })
      .send({ nome: 'Paciente DTO Sintético' }).expect(201)).body.pacienteId;
    for (const perfil of ['consulta', 'edicao']) await http().put(`/pacientes/${patientId}/acesso/${ids[perfil]}`)
      .auth(tokens.administracao, { type: 'bearer' }).send({ ativo: true, podeEditar: perfil === 'edicao' }).expect(200);
  });

  afterAll(async () => { await app?.close(); await owner?.end(); });

  it('responde com campos clínicos explícitos em camelCase para os três perfis', async () => {
    const examType = await owner.query(`SELECT tipo_exame_complementar_id::text FROM ambulatorio.tipo_exame_complementar
      WHERE codigo_exame='holter'`);
    const input = { dataAtendimento: '2026-04-01',
      dadosClinicos: { pesoKg: 70.25, frequenciaCardiacaBpm: 72 },
      diagnosticoChagas: { possuiDiagnosticoChagas: true, resultadoFinal: 'positivo',
        dataResultadoFinal: '2026-03-10', dataDescobertaAutorelato: '2010-05-03' },
      exames: [{ tipoExameId: examType.rows[0].tipo_exame_complementar_id, bloco: 'solicitado',
        resultado: 'Resultado sintético' }],
      pendencias: [{ descricao: 'Pendência sintética' }],
      rastreioFamiliar: { familiaresExaminados: true,
        familiares: [{ familiar: 'Familiar sintético', resultado: 'Sorologia sintética' }] } };
    await http().post(`/pacientes/${patientId}/atendimentos`)
      .auth(tokens.consulta, { type: 'bearer' }).send(input).expect(403);
    const attendanceId = (await http().post(`/pacientes/${patientId}/atendimentos`)
      .auth(tokens.edicao, { type: 'bearer' }).send(input).expect(201)).body.atendimentoId;

    for (const perfil of ['consulta', 'edicao', 'administracao']) {
      const detail = (await http().get(`/pacientes/${patientId}/atendimentos/${attendanceId}`)
        .auth(tokens[perfil], { type: 'bearer' }).expect(200)).body;
      expect(detail.dadosClinicos).toEqual({ alturaCm: null, pesoKg: '70.25',
        circunferenciaAbdominalCm: null, frequenciaCardiacaBpm: 72,
        saturacaoPercentual: null, paSistolicaMmhg: null, paDiastolicaMmhg: null,
        nyha: null, observacoes: null });
      expect(detail.diagnosticoChagas).toEqual({ possuiDiagnosticoChagas: true,
        statusDiagnostico: null, resultadoFinal: 'positivo', dataResultadoFinal: '2026-03-10',
        dataDescobertaAutorelato: '2010-05-03', criterioConfirmacao: null, observacoes: null });
      expect(detail.exames).toEqual([{ exameId: expect.any(String), atendimentoId: attendanceId,
        bloco: 'solicitado', identificacao: null, resultado: 'Resultado sintético',
        observacoes: null, codigoExame: 'holter', nomeExame: expect.any(String) }]);
      expect(detail.pendencias).toEqual([{ pendenciaId: expect.any(String),
        descricao: 'Pendência sintética', status: 'aberta', dataIdentificacao: '2026-04-01' }]);
      expect(detail.rastreioFamiliar).toEqual({ rastreioFamiliarId: expect.any(String),
        familiaresExaminados: true, familiares: [{ rastreioFamiliarId: expect.any(String),
          identificacaoFamiliar: 'Familiar sintético', resultadoSorologia: 'Sorologia sintética' }] });
      expect(detail.rastreiosFamiliares).toEqual([detail.rastreioFamiliar]);
      expect(JSON.stringify(detail)).not.toMatch(/"[^"]*_[^"]*"\s*:/);
    }

    const exams = (await http().get(`/pacientes/${patientId}/exames`)
      .auth(tokens.consulta, { type: 'bearer' }).expect(200)).body;
    expect(exams).toEqual((await http().get(`/pacientes/${patientId}/atendimentos/${attendanceId}`)
      .auth(tokens.consulta, { type: 'bearer' }).expect(200)).body.exames);
  });

  it('mantém o tratamento BZN e reações no DTO explícito e protege a consulta', async () => {
    await http().get(`/pacientes/${patientId}/tratamento-bzn`).expect(401);
    await http().post(`/pacientes/${patientId}/tratamento-bzn`)
      .auth(tokens.consulta, { type: 'bearer' }).send({ temIndicacao: true }).expect(403);
    await http().post(`/pacientes/${patientId}/tratamento-bzn`)
      .auth(tokens.edicao, { type: 'bearer' }).send({ temIndicacao: true, anoUsoAproximado: 2025,
        reacoes: [{ descricao: 'Reação sintética', dataReacao: '2025-08-10' }] }).expect(201);
    const treatment = (await http().get(`/pacientes/${patientId}/tratamento-bzn`)
      .auth(tokens.consulta, { type: 'bearer' }).expect(200)).body;
    expect(treatment).toEqual({ tratamentoId: expect.any(String), atendimentoId: null,
      temIndicacao: true, iniciado: null, tratamentoPeloAmbulatorio: null,
      duracaoCumpridaDias: null, anoUsoAproximado: 2025, dataPrescricao: null,
      motivoNaoIndicacao: null, motivoNaoInicio: null, teveReacaoAdversa: null,
      observacoes: null, reacoes: [{ reacaoId: expect.any(String), descricao: 'Reação sintética',
        gravidade: null, dataReacao: '2025-08-10', consequencia: null, observacoes: null }] });
    expect(JSON.stringify(treatment)).not.toMatch(/"[^"]*_[^"]*"\s*:/);
  });
});
