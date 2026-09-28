import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';

const suite = process.env.TEST_CLINICAL_DB ? describe : describe.skip;
suite('Fluxos clínicos HTTP em banco descartável', () => {
  let app: INestApplication;
  let owner: Pool;
  let patientId: string;
  let otherId: string;
  let attendanceId: string;
  const ids: Record<string, string> = {};
  const tokens: Record<string, string> = {};
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    if (!/^etapa5_clinical_\d+_\d+$/.test(process.env.TEST_CLINICAL_DB!)) throw new Error('Banco descartável obrigatório');
    owner = new Pool({ host: process.env.TEST_OWNER_HOST, port: Number(process.env.TEST_OWNER_PORT),
      user: process.env.TEST_OWNER_USER, password: process.env.TEST_OWNER_PASSWORD, database: process.env.TEST_CLINICAL_DB });
    for (const perfil of ['consulta', 'edicao', 'administracao']) {
      const r = await owner.query(`INSERT INTO ambulatorio.usuario_aplicacao(nome,login,senha_hash,perfil)
        VALUES($1,$2,$3,$4) RETURNING usuario_id::text`, [perfil, `${perfil}@example.invalid`,
        '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK', perfil]);
      ids[perfil] = r.rows[0].usuario_id;
    }
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication(); configureApp(app); await app.init();
    for (const perfil of Object.keys(ids)) tokens[perfil] = await app.get(JwtService).signAsync({ sub: ids[perfil], typ: 'access' });
  });
  afterAll(async () => { await app?.close(); await owner?.end(); });

  it('cadastra paciente completo e limita cadastro conforme perfil', async () => {
    for (const perfil of ['consulta', 'edicao']) await http().post('/pacientes')
      .auth(tokens[perfil], { type: 'bearer' }).send({ nome: 'Cadastro negado sintético' }).expect(403);
    const r = await http().post('/pacientes').auth(tokens.administracao, { type: 'bearer' })
      .send({ nome: 'Paciente HTTP Sintético', dataNascimento: '1980-02-10', sexo: 'feminino',
        endereco: { endereco: 'Rua Sintética', cidade: 'Cidade Sintética' }, telefones: ['000000000'] }).expect(201);
    patientId = r.body.pacienteId;
    const second = await http().post('/pacientes').auth(tokens.administracao, { type: 'bearer' })
      .send({ nome: 'Paciente sem vínculo sintético', dataNascimento: '1990-03-10' }).expect(201);
    otherId = second.body.pacienteId;
    const ficha = await http().get(`/pacientes/${patientId}`).auth(tokens.administracao, { type: 'bearer' }).expect(200);
    expect(ficha.body.telefones).toEqual(['000000000']);
    expect(ficha.body.endereco.cidade).toBe('Cidade Sintética');
    expect(ficha.body.idade).toEqual(expect.any(Number));
    expect(ficha.body.dataReferenciaIdade).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('concede vínculo pela administração e filtra lista, busca e CSV', async () => {
    for (const perfil of ['consulta', 'edicao']) await http().put(`/pacientes/${patientId}/acesso/${ids[perfil]}`)
      .auth(tokens.administracao, { type: 'bearer' }).send({ ativo: true, podeEditar: perfil === 'edicao' }).expect(200);
    const list = await http().get('/pacientes?limit=1&offset=0&nome=Sintético').auth(tokens.consulta, { type: 'bearer' }).expect(200);
    expect(list.body).toEqual([{ pacienteId: patientId, nome: 'Paciente HTTP Sintético' }]);
    await http().get('/pacientes?limit=1&offset=1').auth(tokens.consulta, { type: 'bearer' }).expect(200).expect([]);
    await http().get(`/pacientes/${otherId}`).auth(tokens.consulta, { type: 'bearer' }).expect(403);
    const csv = await http().get('/pacientes/export.csv?limit=100').auth(tokens.consulta, { type: 'bearer' }).expect(200);
    expect(csv.text).toContain('Paciente HTTP Sintético'); expect(csv.text).not.toContain('sem vínculo');
    await http().get('/pacientes').expect(401);
    await http().get('/pacientes?offset=-1').auth(tokens.consulta, { type: 'bearer' }).expect(400);
  });

  it('grava diagnóstico, exames, rastreio e pendências numa transação atribuída', async () => {
    const exame = await owner.query("SELECT tipo_exame_complementar_id::text FROM ambulatorio.tipo_exame_complementar WHERE codigo_exame='holter'");
    const dto = { dataAtendimento: '2026-01-01', diagnosticoChagas: { dataDescobertaAutorelato: '2010-05-03',
      dataResultadoFinal: '2025-12-01', resultadoFinal: 'positivo' }, dadosClinicos: { pesoKg: 70 },
      exames: [{ tipoExameId: exame.rows[0].tipo_exame_complementar_id, bloco: 'solicitado' }],
      pendencias: [{ descricao: 'Pendência sintética' }],
      rastreioFamiliar: { familiaresExaminados: true, familiares: [{ familiar: 'Mãe sintética', resultado: 'Resultado sintético' }] } };
    await http().post(`/pacientes/${patientId}/atendimentos`).auth(tokens.consulta, { type: 'bearer' }).send(dto).expect(403);
    const r = await http().post(`/pacientes/${patientId}/atendimentos`).auth(tokens.edicao, { type: 'bearer' }).send(dto).expect(201);
    attendanceId = r.body.atendimentoId;
    const consulta = await http().get(`/pacientes/${patientId}/atendimentos/${attendanceId}`).auth(tokens.consulta, { type: 'bearer' }).expect(200);
    expect(consulta.body.diagnosticoChagas.data_descoberta_autorelato).toBe('2010-05-03');
    expect(consulta.body.diagnosticoChagas.data_resultado_final).toBe('2025-12-01');
    expect(consulta.body.exames).toHaveLength(1); expect(consulta.body.pendencias).toHaveLength(1);
    expect(consulta.body.rastreioFamiliar.familiares).toHaveLength(1);
    await http().get(`/pacientes/${otherId}/atendimentos/${attendanceId}`).auth(tokens.administracao, { type: 'bearer' }).expect(404);
    const context = await owner.query('SELECT count(*)::int AS n FROM ambulatorio.auditoria_contexto_transacao WHERE ator_usuario_id=$1', [ids.edicao]);
    expect(context.rows[0].n).toBeGreaterThan(0);
  });

  it('reverte atendimento e filhos quando o rastreio viola integridade diferida', async () => {
    const before = await owner.query('SELECT count(*)::int AS n FROM ambulatorio.atendimento');
    await http().post(`/pacientes/${patientId}/atendimentos`).auth(tokens.edicao, { type: 'bearer' })
      .send({ dataAtendimento: '2026-02-01', diagnosticoChagas: { dataDescobertaAutorelato: '2011-01-01' },
        rastreioFamiliar: { familiaresExaminados: true, familiares: [] } }).expect(400);
    const after = await owner.query('SELECT count(*)::int AS n FROM ambulatorio.atendimento');
    expect(after.rows[0].n).toBe(before.rows[0].n);
    const diagnosis = await owner.query("SELECT count(*)::int AS n FROM ambulatorio.diagnostico_chagas WHERE data_descoberta_autorelato='2011-01-01'");
    expect(diagnosis.rows[0].n).toBe(0);
  });

  it('serializa atualizações concorrentes e revoga vínculo imediatamente', async () => {
    const ficha = await http().get(`/pacientes/${patientId}`).auth(tokens.edicao, { type: 'bearer' }).expect(200);
    const responses = await Promise.all(['Nome A sintético', 'Nome B sintético'].map(nome => http().patch(`/pacientes/${patientId}`)
      .auth(tokens.edicao, { type: 'bearer' }).send({ versao: ficha.body.versao, nome })));
    expect(responses.map(r => r.status).sort()).toEqual([200, 409]);
    await http().put(`/pacientes/${patientId}/acesso/${ids.edicao}`).auth(tokens.consulta, { type: 'bearer' })
      .send({ ativo: false, podeEditar: false }).expect(403);
    await http().put(`/pacientes/${patientId}/acesso/${ids.edicao}`).auth(tokens.administracao, { type: 'bearer' })
      .send({ ativo: false, podeEditar: false }).expect(200);
    await http().get(`/pacientes/${patientId}`).auth(tokens.edicao, { type: 'bearer' }).expect(403);
    await http().get('/pacientes').auth(tokens.edicao, { type: 'bearer' }).expect(200).expect([]);
  });

  it('exige contexto BZN e registra somente a data real de comparecimento', async () => {
    const dto = { atendimentoId: attendanceId, tipo: 'retorno_bzn_30_dias', dataRealizada: '2026-03-05' };
    await http().post(`/pacientes/${patientId}/retornos-bzn`).auth(tokens.administracao, { type: 'bearer' }).send(dto).expect(409);
    await owner.query('INSERT INTO ambulatorio.tratamento_benzonidazol(paciente_id,atendimento_id) VALUES($1,$2)', [patientId, attendanceId]);
    await http().post(`/pacientes/${patientId}/retornos-bzn`).auth(tokens.consulta, { type: 'bearer' }).send(dto).expect(403);
    await http().post(`/pacientes/${patientId}/retornos-bzn`).auth(tokens.administracao, { type: 'bearer' }).send(dto).expect(201);
    const r = await http().get(`/pacientes/${patientId}/retornos-bzn`).auth(tokens.consulta, { type: 'bearer' }).expect(200);
    expect(r.body[0].dataRealizada).toBe('2026-03-05'); expect(r.body[0].tipo).toBe('retorno_bzn_30_dias');
  });

  it('rejeita categoria genérica de exame sem identificação e não cria atendimento', async () => {
    const catalog = await owner.query("SELECT tipo_exame_complementar_id::text FROM ambulatorio.tipo_exame_complementar WHERE codigo_exame='outro'");
    const before = await owner.query('SELECT count(*)::int AS n FROM ambulatorio.atendimento');
    await http().post(`/pacientes/${patientId}/atendimentos`).auth(tokens.administracao, { type: 'bearer' })
      .send({ dataAtendimento: '2026-03-01', exames: [{ tipoExameId: catalog.rows[0].tipo_exame_complementar_id, bloco: 'trazido' }] }).expect(400);
    const after = await owner.query('SELECT count(*)::int AS n FROM ambulatorio.atendimento');
    expect(after.rows[0].n).toBe(before.rows[0].n);
  });
});
