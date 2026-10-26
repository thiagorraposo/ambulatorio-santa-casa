import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';
import type { FamiliarExaminadoResponse, RastreioFamiliarResponse } from '../../src/clinico/dto/clinico.response';

const suite = process.env.TEST_CLINICAL_DB ? describe : describe.skip;

suite('Familiares por snapshot no PostgreSQL descartável — R7-01', () => {
  let app: INestApplication;
  let owner: Pool;
  let patientId: string;
  let otherId: string;
  let attendanceId: string;
  let otherAttendanceId: string;
  const users: Record<string, string> = {};
  const tokens: Record<string, string> = {};
  const snapshots: Array<{ id: string; results: FamiliarExaminadoResponse[] }> = [];
  const http = () => request(app.getHttpServer());
  const base = () => `/v1/pacientes/${patientId}/atendimentos/${attendanceId}/rastreios-familiares`;

  beforeAll(async () => {
    if (!/^etapa5_clinical_\d+_\d+$/.test(process.env.TEST_CLINICAL_DB!)) throw new Error('Banco descartável obrigatório');
    owner = new Pool({ host: process.env.TEST_OWNER_HOST, port: Number(process.env.TEST_OWNER_PORT),
      user: process.env.TEST_OWNER_USER, password: process.env.TEST_OWNER_PASSWORD, database: process.env.TEST_CLINICAL_DB });
    for (const perfil of ['consulta', 'edicao', 'administracao']) {
      const result = await owner.query(`INSERT INTO ambulatorio.usuario_aplicacao(nome,login,senha_hash,perfil)
        VALUES($1,$2,$3,$4) RETURNING usuario_id::text`, [`Familiar ${perfil} sintético`, `familia-${perfil}@example.invalid`,
        '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK', perfil]);
      users[perfil] = result.rows[0].usuario_id;
    }
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication(); configureApp(app); await app.init();
    for (const perfil of Object.keys(users)) tokens[perfil] = await app.get(JwtService).signAsync({ sub: users[perfil], typ: 'access' });
    patientId = (await http().post('/v1/pacientes').auth(tokens.administracao, { type: 'bearer' })
      .send({ nome: 'Família trinta e cinquenta sintética' }).expect(201)).body.pacienteId;
    otherId = (await http().post('/v1/pacientes').auth(tokens.administracao, { type: 'bearer' })
      .send({ nome: 'Outra família sintética protegida' }).expect(201)).body.pacienteId;
    for (const perfil of ['consulta', 'edicao']) await http().put(`/v1/pacientes/${patientId}/acesso/${users[perfil]}`)
      .auth(tokens.administracao, { type: 'bearer' }).send({ ativo: true, podeEditar: perfil === 'edicao' }).expect(200);
    attendanceId = (await http().post(`/v1/pacientes/${patientId}/atendimentos`)
      .auth(tokens.edicao, { type: 'bearer' }).send({ dataAtendimento: '2026-04-01', rastreioFamiliar: {
        familiaresExaminados: true, familiares: Array.from({ length: 30 }, (_, index) => ({
          familiar: `Trinta familiar sintético ${index + 1}`, resultado: `Resultado trinta ${index + 1}`,
        })),
      } }).expect(201)).body.atendimentoId;
    otherAttendanceId = (await http().post(`/v1/pacientes/${otherId}/atendimentos`)
      .auth(tokens.administracao, { type: 'bearer' }).send({ dataAtendimento: '2026-04-02' }).expect(201)).body.atendimentoId;
    const client = await owner.connect();
    try {
      await client.query('BEGIN');
      const second = await client.query(`INSERT INTO ambulatorio.rastreio_familiar(paciente_id,atendimento_id,familiares_examinados)
        VALUES($1,$2,true) RETURNING rastreio_familiar_id::text`, [patientId, attendanceId]);
      await client.query(`INSERT INTO ambulatorio.rastreio_familiar_resultado(rastreio_familiar_id,identificacao_familiar,resultado_sorologia)
        SELECT $1,'Cinquenta familiar sintético '||n,'Resultado cinquenta '||n FROM generate_series(1,50) n`,
      [second.rows[0].rastreio_familiar_id]);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    const rows = await owner.query(`SELECT f.rastreio_familiar_id::text,r.rastreio_familiar_resultado_id::text,
      r.identificacao_familiar,r.resultado_sorologia FROM ambulatorio.rastreio_familiar f
      JOIN ambulatorio.rastreio_familiar_resultado r USING(rastreio_familiar_id)
      WHERE f.paciente_id=$1 AND f.atendimento_id=$2 ORDER BY f.rastreio_familiar_id,r.rastreio_familiar_resultado_id`,
    [patientId, attendanceId]);
    for (const row of rows.rows) {
      let snapshot = snapshots.find(item => item.id === row.rastreio_familiar_id);
      if (!snapshot) { snapshot = { id: row.rastreio_familiar_id, results: [] }; snapshots.push(snapshot); }
      snapshot.results.push({ resultadoId: row.rastreio_familiar_resultado_id, rastreioFamiliarId: row.rastreio_familiar_id,
        identificacaoFamiliar: row.identificacao_familiar, resultadoSorologia: row.resultado_sorologia });
    }
    expect(snapshots.map(item => item.results.length)).toEqual([30, 50]);
  });

  afterAll(async () => { await app?.close(); await owner?.end(); });

  it('pagina os dois snapshots sem deslocar suas prévias de filhos', async () => {
    for (const perfil of Object.keys(users)) {
      for (const [offset, snapshot] of snapshots.entries()) {
        const result = await http().get(`${base()}?limit=1&offset=${offset}`)
          .auth(tokens[perfil], { type: 'bearer' }).expect(200);
        expect(result.body).toEqual([{ rastreioFamiliarId: snapshot.id, familiaresExaminados: true,
          familiares: snapshot.results.slice(0, 20), paginacaoFamiliares: { limit: 20, offset: 0 } }]);
      }
      await http().get(`${base()}?limit=1&offset=2`).auth(tokens[perfil], { type: 'bearer' }).expect(200).expect([]);
    }
  });

  it('reúne os 30 e 50 resultados exatos sem repetição, perda ou mistura para os três perfis', async () => {
    for (const perfil of Object.keys(users)) for (const snapshot of snapshots) {
      const collected: FamiliarExaminadoResponse[] = [];
      for (let offset = 0; offset < snapshot.results.length; offset += 20) {
        const result = await http().get(`${base()}/${snapshot.id}/familiares?limit=20&offset=${offset}`)
          .auth(tokens[perfil], { type: 'bearer' }).expect(200);
        const page: RastreioFamiliarResponse = result.body;
        expect(page.rastreioFamiliarId).toBe(snapshot.id);
        expect(page.paginacaoFamiliares).toEqual({ limit: 20, offset });
        expect(page.familiares).toEqual(snapshot.results.slice(offset, offset + 20));
        collected.push(...page.familiares);
      }
      expect(collected).toEqual(snapshot.results);
      expect(new Set(collected.map(result => result.resultadoId)).size).toBe(snapshot.results.length);
      expect(collected.every(result => result.rastreioFamiliarId === snapshot.id && typeof result.resultadoId === 'string')).toBe(true);
    }
  });

  it('preserva alias compatível e informa separadamente a primeira página dos familiares', async () => {
    const path = `/v1/pacientes/${patientId}/atendimentos/${attendanceId}`;
    const result = await http().get(`${path}?limit=1&offset=1`).auth(tokens.consulta, { type: 'bearer' }).expect(200);
    expect(result.body.rastreiosFamiliares).toEqual([{ rastreioFamiliarId: snapshots[1].id, familiaresExaminados: true,
      familiares: snapshots[1].results.slice(0, 20), paginacaoFamiliares: { limit: 20, offset: 0 } }]);
    expect(result.body.rastreioFamiliar).toEqual(result.body.rastreiosFamiliares[0]);
    expect(result.body.paginacaoColecoes).toEqual({ limit: 1, offset: 1 });
    const both = await http().get(`${path}?limit=2`).auth(tokens.consulta, { type: 'bearer' }).expect(200);
    expect(both.body.rastreioFamiliar).toBeNull();
    expect(both.body.rastreiosFamiliares.map((item: RastreioFamiliarResponse) => item.rastreioFamiliarId))
      .toEqual(snapshots.map(snapshot => snapshot.id));
  });

  it('retorna página vazia fora de faixa e valida limites sem transformar ausência de página em ausência de snapshot', async () => {
    for (const snapshot of snapshots) {
      const path = `${base()}/${snapshot.id}/familiares`;
      const result = await http().get(`${path}?limit=7&offset=1000`).auth(tokens.consulta, { type: 'bearer' }).expect(200);
      expect(result.body).toEqual({ rastreioFamiliarId: snapshot.id, familiaresExaminados: true,
        familiares: [], paginacaoFamiliares: { limit: 7, offset: 1000 } });
      const independent = await http().get(`${path}?limit=7&offset=7`).auth(tokens.consulta, { type: 'bearer' }).expect(200);
      expect(independent.body.familiares).toEqual(snapshot.results.slice(7, 14));
    }
    for (const suffix of ['limit=0', 'limit=101', 'offset=-1', 'offset=100001']) {
      for (const path of [base(), `${base()}/${snapshots[0].id}/familiares`])
        await http().get(`${path}?${suffix}`).auth(tokens.consulta, { type: 'bearer' }).expect(400);
    }
  });

  it('exige autenticação/vínculo e recusa cruzamento de paciente, consulta ou snapshot', async () => {
    for (const path of [base(), `${base()}/${snapshots[0].id}/familiares`]) await http().get(path).expect(401);
    const otherBase = `/v1/pacientes/${otherId}/atendimentos/${otherAttendanceId}/rastreios-familiares`;
    for (const path of [otherBase, `${otherBase}/${snapshots[0].id}/familiares`]) {
      const denied = await http().get(path).auth(tokens.consulta, { type: 'bearer' }).expect(403);
      expect(denied.text).not.toContain('familiar sintético');
    }
    await http().get(`${otherBase}/${snapshots[0].id}/familiares`).auth(tokens.administracao, { type: 'bearer' }).expect(404);
    await http().get(`/v1/pacientes/${patientId}/atendimentos/${otherAttendanceId}/rastreios-familiares`)
      .auth(tokens.administracao, { type: 'bearer' }).expect(404);
    await http().put(`/v1/pacientes/${patientId}/acesso/${users.consulta}`)
      .auth(tokens.administracao, { type: 'bearer' }).send({ ativo: false, podeEditar: false }).expect(200);
    for (const path of [base(), `${base()}/${snapshots[0].id}/familiares`]) {
      const denied = await http().get(path).auth(tokens.consulta, { type: 'bearer' }).expect(403);
      expect(denied.text).not.toContain('Trinta familiar');
      expect(denied.text).not.toContain('Cinquenta familiar');
    }
  });
});
