import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Pool } from 'pg';
import request from 'supertest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';

const suite = process.env.TEST_CLINICAL_DB ? describe : describe.skip;
const canonicalJson = (value: unknown): string => {
  const sorted = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(sorted);
    if (item && typeof item === 'object') return Object.fromEntries(
      Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, child]) => [key, sorted(child)]));
    return item;
  };
  return JSON.stringify(sorted(value));
};
const sha256 = (value: string): string => createHash('sha256').update(value, 'utf8').digest('hex');
suite('Fluxos clínicos HTTP em banco descartável', () => {
  let app: INestApplication;
  let owner: Pool;
  let patientId: string;
  let otherId: string;
  let attendanceId: string;
  const ids: Record<string, string> = {};
  const tokens: Record<string, string> = {};
  const temporal: Record<string, string> = {};
  const http = () => request(app.getHttpServer());
  const footprint = async (): Promise<Record<string, string>> => {
    const relations = (await owner.query(`SELECT c.relname,c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='ambulatorio' AND c.relkind IN ('r','S') ORDER BY c.relname`)).rows;
    const result: Record<string, string> = {};
    for (const relation of relations) {
      if (!/^[a-z_][a-z0-9_]*$/.test(relation.relname)) throw new Error('Identificador inesperado no teste');
      const rows = relation.relkind === 'S'
        ? (await owner.query(`SELECT last_value::text,is_called FROM ambulatorio."${relation.relname}"`)).rows
        : (await owner.query(`SELECT md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]')::text) AS hash
          FROM ambulatorio."${relation.relname}" t`)).rows;
      result[relation.relname] = sha256(canonicalJson(rows));
    }
    return result;
  };

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
    await owner.query('INSERT INTO ambulatorio.importacao_revisao_gestor(usuario_id) VALUES($1)', [ids.administracao]);
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
    const formula = await http().post('/pacientes').auth(tokens.administracao, { type: 'bearer' })
      .send({ nome: '=1+1,\"nome\"' }).expect(201);
    await http().put(`/pacientes/${formula.body.pacienteId}/acesso/${ids.consulta}`)
      .auth(tokens.administracao, { type: 'bearer' }).send({ ativo: true, podeEditar: false }).expect(200);
    const protectedCsv = await http().get('/pacientes/export.csv?limit=100')
      .auth(tokens.consulta, { type: 'bearer' }).expect(200);
    expect(protectedCsv.text).toContain("\"'=1+1,\"\"nome\"\"\"");
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
    expect(consulta.body.diagnosticoChagas.dataDescobertaAutorelato).toBe('2010-05-03');
    expect(consulta.body.diagnosticoChagas.dataResultadoFinal).toBe('2025-12-01');
    expect(consulta.body.exames).toHaveLength(1); expect(consulta.body.pendencias).toHaveLength(1);
    expect(consulta.body.rastreioFamiliar.familiares).toHaveLength(1);
    await http().get(`/pacientes/${otherId}/atendimentos/${attendanceId}`).auth(tokens.administracao, { type: 'bearer' }).expect(404);
    const context = await owner.query('SELECT count(*)::int AS n FROM ambulatorio.auditoria_contexto_transacao WHERE ator_usuario_id=$1', [ids.edicao]);
    expect(context.rows[0].n).toBeGreaterThan(0);
  });

  it('preserva snapshots familiares distintos sem misturar seus resultados', async () => {
    await owner.query(`INSERT INTO ambulatorio.rastreio_familiar(paciente_id,atendimento_id,familiares_examinados)
      VALUES($1,$2,false)`, [patientId, attendanceId]);
    for (const perfil of ['consulta', 'edicao', 'administracao']) {
      const detail = await http().get(`/pacientes/${patientId}/atendimentos/${attendanceId}`)
        .auth(tokens[perfil], { type: 'bearer' }).expect(200);
      expect(detail.body.rastreioFamiliar).toBeNull();
      expect(detail.body.rastreiosFamiliares).toHaveLength(2);
      expect(detail.body.rastreiosFamiliares.map((s: { familiaresExaminados: boolean }) => s.familiaresExaminados)).toEqual([true, false]);
      expect(detail.body.rastreiosFamiliares.map((s: { familiares: unknown[] }) => s.familiares.length)).toEqual([1, 0]);
    }
  });

  it('pagina coleções clínicas e consulta pendências por status e vínculo', async () => {
    const exame = await owner.query("SELECT tipo_exame_complementar_id::text FROM ambulatorio.tipo_exame_complementar WHERE codigo_exame='holter'");
    const second = await http().post(`/pacientes/${patientId}/atendimentos`).auth(tokens.edicao, { type: 'bearer' })
      .send({ dataAtendimento: '2026-01-15', exames: [{ tipoExameId: exame.rows[0].tipo_exame_complementar_id, bloco: 'trazido' }],
        pendencias: [{ descricao: 'Pendência concluída sintética', status: 'resolvida', dataResolucao: '2026-01-15' }] }).expect(201);
    for (const perfil of ['consulta', 'edicao', 'administracao']) {
      const first = await http().get(`/pacientes/${patientId}/atendimentos?limit=1`).auth(tokens[perfil], { type: 'bearer' }).expect(200);
      expect(first.body.map((a: { atendimentoId: string }) => a.atendimentoId)).toEqual([second.body.atendimentoId]);
      const next = await http().get(`/pacientes/${patientId}/atendimentos?limit=1&offset=1`).auth(tokens[perfil], { type: 'bearer' }).expect(200);
      expect(next.body.map((a: { atendimentoId: string }) => a.atendimentoId)).toEqual([attendanceId]);
      const pending = await http().get(`/pacientes/${patientId}/pendencias?status=aberta&limit=1`)
        .auth(tokens[perfil], { type: 'bearer' }).expect(200);
      expect(pending.body).toEqual([{ pendenciaId: expect.any(String), atendimentoId: attendanceId,
        descricao: 'Pendência sintética', status: 'aberta', dataIdentificacao: '2026-01-01', dataResolucao: null }]);
      await http().get(`/pacientes/${patientId}/pendencias?status=aberta&limit=1&offset=1`)
        .auth(tokens[perfil], { type: 'bearer' }).expect(200).expect([]);
    }
    const exams = await http().get(`/pacientes/${patientId}/exames?limit=1&offset=1`).auth(tokens.consulta, { type: 'bearer' }).expect(200);
    expect(exams.body).toHaveLength(1);
    for (const resource of ['atendimentos', 'exames', 'projetos', 'retornos-bzn', 'pendencias']) {
      await http().get(`/pacientes/${patientId}/${resource}?limit=101`).auth(tokens.consulta, { type: 'bearer' }).expect(400);
      await http().get(`/pacientes/${otherId}/${resource}`).auth(tokens.consulta, { type: 'bearer' }).expect(403);
      await http().get(`/pacientes/${patientId}/${resource}`).expect(401);
    }
    await http().get(`/pacientes/${patientId}/pendencias?status=inventado`).auth(tokens.consulta, { type: 'bearer' }).expect(400);
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

  it('edita o cadastro composto sem descartar contatos ou endereços legados', async () => {
    const ficha = await http().get(`/pacientes/${patientId}`).auth(tokens.edicao, { type: 'bearer' }).expect(200);
    const dto = { versao: ficha.body.versao, pertenceComunidadeTradicional: true, tipoComunidadeTradicional: 'quilombola',
      endereco: { cidade: 'Cidade atualizada sintética' }, telefonesAdicionar: ['000000001', '000000001', '000000000'] };
    await http().patch(`/pacientes/${patientId}`).auth(tokens.consulta, { type: 'bearer' }).send(dto).expect(403);
    await http().patch(`/pacientes/${otherId}`).auth(tokens.edicao, { type: 'bearer' }).send(dto).expect(403);
    const r = await http().patch(`/pacientes/${patientId}`).auth(tokens.edicao, { type: 'bearer' }).send(dto).expect(200);
    const updated = await http().get(`/pacientes/${patientId}`).auth(tokens.consulta, { type: 'bearer' }).expect(200);
    expect(updated.body.versao).toBe(r.body.versao);
    expect(updated.body.endereco).toEqual({ endereco: 'Rua Sintética', cidade: 'Cidade atualizada sintética' });
    expect(updated.body.telefones).toEqual(['000000000', '000000001']);
    expect(updated.body.tipoComunidadeTradicional).toBe('quilombola');
    const addresses = await owner.query('SELECT count(*)::int AS n FROM ambulatorio.paciente_endereco WHERE paciente_id=$1', [patientId]);
    expect(addresses.rows[0].n).toBe(2);
    await http().patch(`/pacientes/${patientId}`).auth(tokens.edicao, { type: 'bearer' })
      .send({ ...dto, endereco: { cidade: 'Não deve persistir' }, telefonesAdicionar: ['000000002'] }).expect(409);
    const unchanged = await http().get(`/pacientes/${patientId}`).auth(tokens.consulta, { type: 'bearer' }).expect(200);
    expect(unchanged.body.endereco).toEqual(updated.body.endereco); expect(unchanged.body.telefones).toEqual(updated.body.telefones);
    await http().patch(`/pacientes/${patientId}`).auth(tokens.edicao, { type: 'bearer' })
      .send({ versao: r.body.versao }).expect(400);
  });

  it('edita atendimento por vínculo e versão, com rollback de violação SQL', async () => {
    const path = `/pacientes/${patientId}/atendimentos/${attendanceId}`;
    const before = await http().get(path).auth(tokens.consulta, { type: 'bearer' }).expect(200);
    const historyCount = async () => (await owner.query(`SELECT count(*)::int AS n
      FROM ambulatorio.auditoria_campo_evento e JOIN ambulatorio.auditoria_campo c USING(campo_id)
      WHERE c.tabela_destino='atendimento' AND c.coluna_destino='observacoes' AND e.registro_id=$1`,
    [attendanceId])).rows[0].n as number;
    const originalEvents = await historyCount();
    await http().patch(path).auth(tokens.consulta, { type: 'bearer' })
      .send({ versao: before.body.versao, observacoes: 'Edição negada' }).expect(403);
    await http().patch(`/pacientes/${otherId}/atendimentos/${attendanceId}`).auth(tokens.administracao, { type: 'bearer' })
      .send({ versao: before.body.versao, observacoes: 'Paciente incorreto' }).expect(404);
    await http().patch(path).auth(tokens.edicao, { type: 'bearer' }).send({ versao: before.body.versao,
      observacoes: 'Não deve persistir', ambulatorioUnicamente: true, ambulatorioAnexoProjeto: true }).expect(400);
    const reverted = await http().get(path).auth(tokens.consulta, { type: 'bearer' }).expect(200);
    expect(reverted.body).toEqual(before.body);
    expect(await historyCount()).toBe(originalEvents);
    await http().patch(path).auth(tokens.edicao, { type: 'bearer' })
      .send({ versao: before.body.versao, dataAtendimento: null }).expect(400);
    const results = await Promise.all(['Observação A', 'Observação B'].map(observacoes => http().patch(path)
      .auth(tokens.edicao, { type: 'bearer' }).send({ versao: before.body.versao, observacoes })));
    expect(results.map(r => r.status).sort()).toEqual([200, 409]);
    const after = await http().get(path).auth(tokens.consulta, { type: 'bearer' }).expect(200);
    expect(after.body.diagnosticoChagas).toEqual(before.body.diagnosticoChagas);
    expect(after.body.exames).toEqual(before.body.exames);
    expect(await historyCount()).toBe(originalEvents + 1);
    expect((await owner.query(`SELECT e.origem,e.ator_usuario_id::text AS ator,e.depois->>'valor' AS valor
      FROM ambulatorio.auditoria_campo_evento e JOIN ambulatorio.auditoria_campo c USING(campo_id)
      WHERE c.tabela_destino='atendimento' AND c.coluna_destino='observacoes' AND e.registro_id=$1
      ORDER BY e.versao_campo DESC LIMIT 1`, [attendanceId])).rows[0])
      .toEqual({ origem: 'aplicacao', ator: ids.edicao, valor: after.body.observacoes });
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
    await http().post(`/pacientes/${patientId}/tratamento-bzn`).auth(tokens.consulta, { type: 'bearer' })
      .send({ atendimentoId: attendanceId, temIndicacao: true }).expect(403);
    await http().post(`/pacientes/${otherId}/tratamento-bzn`).auth(tokens.administracao, { type: 'bearer' })
      .send({ atendimentoId: attendanceId, temIndicacao: true }).expect(400);
    const treatmentDto = { atendimentoId: attendanceId, temIndicacao: true, iniciado: true, anoUsoAproximado: 2026,
      teveReacaoAdversa: true, reacoes: [{ descricao: 'Reação sintética', gravidade: 'Texto sintético sem classificação inferida' }] };
    const registrations = await Promise.all([1, 2].map(() => http().post(`/pacientes/${patientId}/tratamento-bzn`)
      .auth(tokens.administracao, { type: 'bearer' }).send(treatmentDto)));
    expect(registrations.map(r => r.status).sort()).toEqual([201, 409]);
    const treatment = await http().get(`/pacientes/${patientId}/tratamento-bzn`).auth(tokens.consulta, { type: 'bearer' }).expect(200);
    expect(treatment.body.anoUsoAproximado).toBe(2026);
    expect(treatment.body.dataPrescricao).toBeNull();
    expect(treatment.body.reacoes).toHaveLength(1);
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

  it('importa por HTTP com worker isolado, pagina lotes e mantém idempotência', async () => {
    const file = process.env.TEST_IMPORT_FIXTURE!;
    await http().post('/importacoes').field('finalidade', 'carga_inicial').field('codigoLote', 'http-sintetico')
      .attach('arquivo', file).expect(401);
    await http().post('/importacoes').auth(tokens.consulta, { type: 'bearer' })
      .field('finalidade', 'carga_inicial').field('codigoLote', 'http-sintetico').attach('arquivo', file).expect(403);
    await http().post('/importacoes').auth(tokens.edicao, { type: 'bearer' })
      .field('finalidade', 'carga_inicial').field('codigoLote', 'http-invalido').field('dryRun', 'talvez').attach('arquivo', file).expect(400);
    const count = async () => (await owner.query('SELECT count(*)::int AS n FROM ambulatorio.paciente')).rows[0].n;
    const before = await count();
    const dry = await http().post('/importacoes').auth(tokens.edicao, { type: 'bearer' })
      .field('finalidade', 'carga_inicial').field('codigoLote', 'http-dry-run').field('dryRun', 'true').attach('arquivo', file).expect(201);
    expect(dry.body).toMatchObject({ dryRun: true, loteId: null, status: 'dry_run_concluido' });
    expect(await count()).toBe(before);
    const imported = await http().post('/importacoes').auth(tokens.edicao, { type: 'bearer' })
      .field('finalidade', 'carga_inicial').field('codigoLote', 'http-sintetico').attach('arquivo', file).expect(201);
    expect(imported.body.loteId).toMatch(/^[1-9]\d*$/);
    expect(await count()).toBe(before + 2);
    const repeated = await http().post('/importacoes').auth(tokens.administracao, { type: 'bearer' })
      .field('finalidade', 'mesmo_conteudo').field('codigoLote', 'http-outro-codigo').attach('arquivo', file).expect(201);
    expect(repeated.body.loteId).toBe(imported.body.loteId);
    expect(repeated.body.codigoLote).toBe('http-sintetico');
    expect(repeated.body.codigoLoteSolicitado).toBe('http-outro-codigo');
    expect(await count()).toBe(before + 2);
    const importedPatients = await owner.query(`SELECT DISTINCT registro_id::text AS paciente_id FROM ambulatorio.importacao_registro r
      JOIN ambulatorio.importacao_linha i USING(importacao_linha_id)
      WHERE i.importacao_lote_id=$1 AND r.tabela_destino='paciente' ORDER BY registro_id::text`, [imported.body.loteId]);
    expect(importedPatients.rows).toHaveLength(2);
    for (const patient of importedPatients.rows) {
      for (const perfil of ['consulta', 'edicao']) await http().put(`/pacientes/${patient.paciente_id}/acesso/${ids[perfil]}`)
        .auth(tokens.administracao, { type: 'bearer' }).send({ ativo: true, podeEditar: perfil === 'edicao' }).expect(200);
    }
    for (const perfil of ['consulta', 'edicao', 'administracao']) {
      const list = await http().get('/importacoes/lotes?limit=1').auth(tokens[perfil], { type: 'bearer' }).expect(200);
      expect(list.body[0].loteId).toBe(imported.body.loteId);
      const detail = await http().get(`/importacoes/lotes/${imported.body.loteId}?limit=1&offset=1`)
        .auth(tokens[perfil], { type: 'bearer' }).expect(200);
      expect(detail.body.linhas).toHaveLength(1);
      expect(detail.body.paginacaoLinhas).toEqual({ limit: 1, offset: 1 });
      const serialized = JSON.stringify(detail.body);
      for (const forbidden of ['dados_brutos', 'mensagem_processamento', 'senha_hash', 'hash_arquivo']) expect(serialized).not.toContain(forbidden);
      await http().get(`/importacoes/lotes/${imported.body.loteId}?offset=-1`).auth(tokens[perfil], { type: 'bearer' }).expect(400);
    }
    const context = await owner.query("SELECT count(*)::int AS n FROM ambulatorio.auditoria_contexto_transacao WHERE origem='importacao'");
    expect(context.rows[0].n).toBeGreaterThanOrEqual(2);
    const links = await owner.query(`SELECT count(*)::int AS n FROM ambulatorio.importacao_registro r
      JOIN ambulatorio.importacao_linha i USING(importacao_linha_id) WHERE i.importacao_lote_id=$1`, [imported.body.loteId]);
    expect(links.rows[0].n).toBeGreaterThanOrEqual(4);
    await http().post('/importacoes').auth(tokens.administracao, { type: 'bearer' })
      .field('finalidade', 'revisao').field('codigoLote', 'http-revisao-bloqueada').attach('arquivo', file).expect(400);
    expect(await count()).toBe(before + 2);
  }, 60000);

  it('serializa publicação concorrente da mesma versão temporal em duas sessões', async () => {
    const seed = await owner.connect();
    let revision: string; let authorization: string; let baseLine: string; let revisedLine: string;
    let targetPatient: string; let targetAttendance: string; let fields: unknown[];
    try {
      await seed.query('BEGIN');
      const base = (await seed.query(`SELECT importacao_lote_id,hash_arquivo_sha256,layout_versao,manifesto_sha256,
        importador_versao,revisao_git FROM ambulatorio.importacao_lote WHERE codigo_lote='http-sintetico'`)).rows[0];
      const anchors = (await seed.query(`SELECT i.importacao_linha_id::text,i.dados_brutos,i.aba_nome_original,i.aba_ordem,
        p.registro_id::text AS paciente,a.registro_id::text AS atendimento FROM ambulatorio.importacao_linha i
        JOIN ambulatorio.importacao_registro p ON p.importacao_linha_id=i.importacao_linha_id AND p.tabela_destino='paciente'
        JOIN ambulatorio.importacao_registro a ON a.importacao_linha_id=i.importacao_linha_id AND a.tabela_destino='atendimento'
        WHERE i.importacao_lote_id=$1 ORDER BY i.numero_linha LIMIT 1`, [base.importacao_lote_id])).rows[0];
      baseLine = anchors.importacao_linha_id; targetPatient = anchors.paciente; targetAttendance = anchors.atendimento;
      const manifest = JSON.parse(readFileSync(resolve(__dirname, '../../../manifestos/planilha_ambulatorio_v1.json'), 'utf8'));
      const manifestBytes = canonicalJson(manifest);
      expect(sha256(manifestBytes)).toBe(base.manifesto_sha256);
      const nameCell = anchors.dados_brutos.find((cell: { chave: string }) => cell.chave === 'nome');
      const transformationBytes = canonicalJson({ formato: 'revisao-transformacoes/v1', regras: [{
        chave: nameCell.chave, bloco: nameCell.bloco, ocorrencia: nameCell.ocorrencia ?? 1,
        tabela: 'paciente', coluna: 'nome', transformacao: 'texto_aparado',
      }] });
      const transformationHash = sha256(transformationBytes);
      await seed.query(`INSERT INTO ambulatorio.revisao_artefato(sha256,tipo,versao,conteudo)
        VALUES($1,'manifesto',$2,$3),($4,'transformacoes','http-concorrente-v1',$5)`,
      [base.manifesto_sha256, manifest.versao, manifestBytes, transformationHash, transformationBytes]);
      const revised = (await seed.query(`INSERT INTO ambulatorio.importacao_lote
        (codigo_lote,hash_arquivo_sha256,layout_versao,manifesto_sha256,importador_versao,revisao_git,status_lote)
        VALUES('revisao-concorrente-sintetica',$1,$2,$3,$4,$5,'pronto') RETURNING importacao_lote_id`,
      ['5'.repeat(64),base.layout_versao,base.manifesto_sha256,base.importador_versao,base.revisao_git])).rows[0].importacao_lote_id;
      revisedLine = (await seed.query(`INSERT INTO ambulatorio.importacao_linha
        (importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos)
        VALUES($1,$2,$3,37,$4::jsonb) RETURNING importacao_linha_id::text`,
      [revised, anchors.aba_nome_original, anchors.aba_ordem, JSON.stringify(anchors.dados_brutos)])).rows[0].importacao_linha_id;
      const field = (await seed.query(`INSERT INTO ambulatorio.auditoria_campo
        (tabela_destino,coluna_destino,coluna_pk,tipo_sql,serializacao_versao,captura_desde)
        VALUES('paciente','nome','paciente_id','character varying(255)','v1',clock_timestamp()) RETURNING campo_id::text`)).rows[0].campo_id;
      const name = (await seed.query('SELECT nome FROM ambulatorio.paciente WHERE paciente_id=$1', [targetPatient])).rows[0].nome;
      await seed.query('SET LOCAL ROLE ambulatorio_servico_autenticado');
      await seed.query('SELECT ambulatorio.auditoria_iniciar_aplicacao($1)', [ids.administracao]);
      await seed.query('SET LOCAL ROLE ambulatorio_revisao_gestor');
      const source = (await seed.query('SELECT ambulatorio.revisao_registrar_fonte($1,$2) AS id',
        ['fonte-concorrente-sintetica',base.importacao_lote_id])).rows[0].id;
      authorization = (await seed.query('SELECT ambulatorio.revisao_conceder_autorizacao($1,$2) AS id',
        [source,ids.administracao])).rows[0].id;
      await seed.query('SET LOCAL ROLE ambulatorio_revisao_servico');
      revision = (await seed.query('SELECT ambulatorio.revisao_preparar($1,$2,$3,$4,$5)::text AS id',
        [source,base.importacao_lote_id,revised,transformationHash,authorization])).rows[0].id;
      const envelope = { estado: 'valor', tipo_sql: 'character varying(255)', valor: name,
        precisao: 'nao_temporal', serializacao_versao: 'v1' };
      fields = [{ campoId: field, registroId: targetPatient, alvoChave: 'paciente', chaveSemantica: 'nome',
        blocoFuncional: nameCell.bloco, ocorrencia: nameCell.ocorrencia ?? 1,
        categoria: 'sem_mudanca', operacao: 'associar', base: envelope, proposto: envelope }];
      await seed.query('COMMIT');
    } catch (error) { await seed.query('ROLLBACK'); throw error; }
    finally { seed.release(); }
    const publish = async () => {
      const session = await owner.connect();
      try {
        await session.query('BEGIN');
        await session.query('SET LOCAL ROLE ambulatorio_servico_autenticado');
        await session.query('SELECT ambulatorio.auditoria_iniciar_aplicacao($1)', [ids.administracao]);
        await session.query('SET LOCAL ROLE ambulatorio_revisao_servico');
        const result = await session.query(`SELECT ambulatorio.revisao_publicar_decisao
          ($1,$2,$3,$4,$5,$6,'autorizar','Associacao concorrente sintetica',$7::jsonb) AS id`,
        [revision,revisedLine,baseLine,targetPatient,targetAttendance,authorization,JSON.stringify(fields)]);
        await session.query('COMMIT'); return result.rows[0].id;
      } catch (error) { await session.query('ROLLBACK'); throw error; }
      finally { session.release(); }
    };
    const outcomes = await Promise.allSettled([publish(), publish()]);
    expect(outcomes.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    const refused = outcomes.find(r => r.status === 'rejected') as PromiseRejectedResult;
    expect(refused.reason).toMatchObject({ code: '23514', message: 'revisao_versao_decisao_obsoleta' });
    const stored = await owner.query(`SELECT count(*)::int AS n FROM ambulatorio.importacao_revisao_decisao
      WHERE revisao_id=$1 AND linha_revisada_id=$2`, [revision!,revisedLine!]);
    expect(stored.rows[0].n).toBe(1);
    const effects = await owner.query('SELECT count(*)::int AS n FROM ambulatorio.importacao_revisao_aplicacao');
    expect(effects.rows[0].n).toBe(0);
    // Captura habilitada apenas no banco de teste: A->B->A preserva dois eventos.
    const initial = await http().get(`/pacientes/${targetPatient!}`).auth(tokens.administracao, { type: 'bearer' }).expect(200);
    let version = initial.body.versao;
    for (const nome of ['Nome manual temporário sintético', initial.body.nome]) {
      const edited = await http().patch(`/pacientes/${targetPatient!}`).auth(tokens.administracao, { type: 'bearer' })
        .send({ versao: version, nome }).expect(200);
      version = edited.body.versao;
    }
    const history = await owner.query(`SELECT e.origem,e.ator_usuario_id::text,e.versao_campo::text
      FROM ambulatorio.auditoria_campo_evento e JOIN ambulatorio.auditoria_campo c USING(campo_id)
      WHERE c.tabela_destino='paciente' AND c.coluna_destino='nome' AND e.registro_id=$1 ORDER BY e.versao_campo`, [targetPatient!]);
    expect(history.rows.map(e => e.origem)).toEqual(['marco_atual', 'aplicacao', 'aplicacao']);
    expect(history.rows.map(e => e.versao_campo)).toEqual(['1', '2', '3']);
    expect(history.rows.slice(1).map(e => e.ator_usuario_id)).toEqual([ids.administracao, ids.administracao]);
    const approved = await owner.query(`SELECT c.ultimo_evento_avaliado_id,c.cobertura_historica
      FROM ambulatorio.importacao_revisao_campo c JOIN ambulatorio.importacao_revisao_decisao d USING(decisao_id)
      WHERE d.revisao_id=$1`, [revision!]);
    expect(approved.rows).toEqual([{ ultimo_evento_avaliado_id: null, cobertura_historica: 'desconhecida' }]);
  }, 60000);
  it('aprova correção apenas com captura atribuível desde a base sem aplicar fatos clínicos', async () => {
    const session = await owner.connect();
    const beforeName = 'Paciente cobertura sintetico';
    const afterName = 'Paciente corrigido cobertura sintetico';
    const raw = [{ posicao: 'A', cabecalho: 'Nome', chave: 'nome', bloco: 'cadastro', ocorrencia: 1, valor: beforeName },
      { posicao: 'B', cabecalho: 'Data', chave: 'data_do_atendimento', bloco: 'geral', ocorrencia: 1, valor: '01/01/2026' },
      { posicao: 'C', cabecalho: 'Observacao', chave: 'observacoes', bloco: 'geral', ocorrencia: 1, valor: 'Observacao base sintetica' }];
    const revisedRaw = raw.map(cell => ({ ...cell, valor: cell.chave === 'nome' ? afterName :
      cell.chave === 'data_do_atendimento' ? '02/01/2026' : 'Observacao corrigida sintetica' }));
    const manifest = { versao: 'cobertura-v1', layout_versao: 'layout-cobertura-v1', sheets: [{
      aba_nome_original: 'Sintetica', aba_ordem: 1, columns: raw.map(cell => ({
        posicao_fisica: cell.posicao, cabecalho_original: cell.cabecalho, chave_semantica: cell.chave,
        bloco_funcional: cell.bloco, ocorrencia: cell.ocorrencia,
      })),
    }] };
    const manifestBytes = canonicalJson(manifest);
    const transformationBytes = canonicalJson({ formato: 'revisao-transformacoes/v1', regras: [
      { chave: 'nome', bloco: 'cadastro', ocorrencia: 1, tabela: 'paciente', coluna: 'nome', transformacao: 'texto' },
      { chave: 'data_do_atendimento', bloco: 'geral', ocorrencia: 1, tabela: 'atendimento', coluna: 'data_atendimento', transformacao: 'data_dd_mm_aaaa' },
      { chave: 'observacoes', bloco: 'geral', ocorrencia: 1, tabela: 'atendimento', coluna: 'observacoes', transformacao: 'texto' },
    ] });
    const envelope = (valor: string, tipo: string) => ({ estado: 'valor', valor, tipo_sql: tipo,
      precisao: tipo === 'date' ? 'data_completa' : 'nao_temporal', serializacao_versao: 'v1' });
    let target: string; let attendance: string; let approved: string;
    try {
      await session.query('BEGIN');
      const nameField = (await session.query("SELECT campo_id::text FROM ambulatorio.auditoria_campo WHERE tabela_destino='paciente' AND coluna_destino='nome'")).rows[0].campo_id;
      const dateField = (await session.query(`SELECT campo_id::text FROM ambulatorio.auditoria_campo
        WHERE tabela_destino='atendimento' AND coluna_destino='data_atendimento'
          AND coluna_pk='atendimento_id' AND tipo_sql='date' AND captura_desde IS NOT NULL`)).rows[0].campo_id;
      const observationField = (await session.query(`SELECT campo_id::text FROM ambulatorio.auditoria_campo
        WHERE tabela_destino='atendimento' AND coluna_destino='observacoes'
          AND coluna_pk='atendimento_id' AND tipo_sql='text' AND captura_desde IS NOT NULL`)).rows[0].campo_id;
      await session.query(`INSERT INTO ambulatorio.revisao_artefato(sha256,tipo,versao,conteudo)
        VALUES($1,'manifesto','cobertura-v1',$2),($3,'transformacoes','cobertura-v1',$4)`,
      [sha256(manifestBytes),manifestBytes,sha256(transformationBytes),transformationBytes]);
      const base = (await session.query(`INSERT INTO ambulatorio.importacao_lote
        (codigo_lote,hash_arquivo_sha256,layout_versao,status_lote,manifesto_sha256,importador_versao,revisao_git)
        VALUES('cobertura-base-sintetica',$1,'layout-cobertura-v1','processando',$2,'1.5.0','abcdef0') RETURNING importacao_lote_id`,
      [sha256(canonicalJson(raw)),sha256(manifestBytes)])).rows[0].importacao_lote_id;
      const baseLine = (await session.query(`INSERT INTO ambulatorio.importacao_linha
        (importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha)
        VALUES($1,'Sintetica',1,2,$2::jsonb,'processando') RETURNING importacao_linha_id`, [base,JSON.stringify(raw)])).rows[0].importacao_linha_id;
      // Primeiro job: escrita real sob contexto de importacao; commit valida eventos.
      await session.query('SET LOCAL ROLE ambulatorio_importador');
      await session.query('SELECT ambulatorio.auditoria_iniciar_importacao($1)', [baseLine]);
      target = (await session.query('INSERT INTO ambulatorio.paciente(nome) VALUES($1) RETURNING paciente_id::text', [beforeName])).rows[0].paciente_id;
      attendance = (await session.query(`INSERT INTO ambulatorio.atendimento(paciente_id,data_atendimento,observacoes)
        VALUES($1,'2026-01-01','Observacao base sintetica') RETURNING atendimento_id::text`, [target])).rows[0].atendimento_id;
      await session.query(`INSERT INTO ambulatorio.importacao_registro(importacao_linha_id,tabela_destino,registro_id,acao)
        VALUES($1,'paciente',$2,'criado'),($1,'atendimento',$3,'criado')`, [baseLine,target,attendance]);
      await session.query("UPDATE ambulatorio.importacao_linha SET status_linha='importada' WHERE importacao_linha_id=$1", [baseLine]);
      await session.query("UPDATE ambulatorio.importacao_lote SET status_lote='concluido' WHERE importacao_lote_id=$1", [base]);
      await session.query('COMMIT');
      // Segundo job: revisor autenticado, sem forjar/substituir o ledger anterior.
      await session.query('BEGIN');
      const otherLine = (await session.query(`INSERT INTO ambulatorio.importacao_linha
        (importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha)
        VALUES($1,'Sintetica',1,3,$2::jsonb,'ignorada') RETURNING importacao_linha_id`, [base,JSON.stringify(raw)])).rows[0].importacao_linha_id;
      expect((await session.query('SELECT ambulatorio.revisao_cobertura_base($1,$2,$3,$4::jsonb) AS cobertura',
        [otherLine,nameField,target,JSON.stringify(envelope(beforeName,'character varying(255)'))])).rows[0].cobertura).toBe('posterior_base');
      const revised = (await session.query(`INSERT INTO ambulatorio.importacao_lote
        (codigo_lote,hash_arquivo_sha256,layout_versao,status_lote,manifesto_sha256,importador_versao,revisao_git)
        VALUES('cobertura-revisado-sintetico',$1,'layout-cobertura-v1','pronto',$2,'1.5.0','abcdef0') RETURNING importacao_lote_id`,
      [sha256(canonicalJson(revisedRaw)),sha256(manifestBytes)])).rows[0].importacao_lote_id;
      const revisedLine = (await session.query(`INSERT INTO ambulatorio.importacao_linha
        (importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos)
        VALUES($1,'Sintetica',1,37,$2::jsonb) RETURNING importacao_linha_id`, [revised,JSON.stringify(revisedRaw)])).rows[0].importacao_linha_id;
      await session.query('SET LOCAL ROLE ambulatorio_servico_autenticado');
      await session.query('SELECT ambulatorio.auditoria_iniciar_aplicacao($1)', [ids.administracao]);
      await session.query('SET LOCAL ROLE ambulatorio_revisao_gestor');
      const source = (await session.query("SELECT ambulatorio.revisao_registrar_fonte('fonte-cobertura-sintetica',$1) AS id", [base])).rows[0].id;
      const authorization = (await session.query('SELECT ambulatorio.revisao_conceder_autorizacao($1,$2) AS id', [source,ids.administracao])).rows[0].id;
      await session.query('SET LOCAL ROLE ambulatorio_revisao_servico');
      const revision = (await session.query('SELECT ambulatorio.revisao_preparar($1,$2,$3,$4,$5) AS id',
        [source,base,revised,sha256(transformationBytes),authorization])).rows[0].id;
      const fields = [{ campoId: nameField, registroId: target, alvoChave: 'paciente', chaveSemantica: 'nome',
        blocoFuncional: 'cadastro', ocorrencia: 1, categoria: 'atualizacao_consolidada', operacao: 'definir',
        base: envelope(beforeName, 'character varying(255)'), proposto: envelope(afterName, 'character varying(255)') },
      { campoId: dateField, registroId: attendance, alvoChave: 'atendimento', chaveSemantica: 'data_do_atendimento',
        blocoFuncional: 'geral', ocorrencia: 1, categoria: 'correcao_ocorrencia', operacao: 'definir',
        base: envelope('2026-01-01', 'date'), proposto: envelope('2026-01-02', 'date') }];
      fields.push({ campoId: observationField, registroId: attendance, alvoChave: 'atendimento', chaveSemantica: 'observacoes',
        blocoFuncional: 'geral', ocorrencia: 1, categoria: 'correcao_ocorrencia', operacao: 'definir',
        base: envelope('Observacao base sintetica', 'text'), proposto: envelope('Observacao corrigida sintetica', 'text') });
      approved = (await session.query(`SELECT ambulatorio.revisao_publicar_decisao
        ($1,$2,$3,$4,$5,$6,'autorizar','Conciliacao explicita do paciente e correcao sintetica da mesma ocorrencia',$7::jsonb)::text AS id`,
      [revision,revisedLine,baseLine,target,attendance,authorization,JSON.stringify(fields)])).rows[0].id;
      Object.assign(temporal, { decision: approved, authorization, revision, source, target, attendance,
        beforeName, afterName, baseLine, revisedLine });
      await session.query('COMMIT');
    } catch (error) { await session.query('ROLLBACK'); throw error; }
    finally { session.release(); }
    const fields = (await owner.query(`SELECT campo_id::text,registro_id::text,ultimo_evento_avaliado_id::text,cobertura_historica
      FROM ambulatorio.importacao_revisao_campo WHERE decisao_id=$1`, [approved!])).rows;
    expect(fields).toHaveLength(3);
    expect(fields.every(field => field.cobertura_historica === 'desde_base' && field.ultimo_evento_avaliado_id)).toBe(true);
    expect((await owner.query('SELECT nome FROM ambulatorio.paciente WHERE paciente_id=$1', [target!])).rows[0].nome).toBe(beforeName);
    expect((await owner.query('SELECT data_atendimento::text AS data FROM ambulatorio.atendimento WHERE atendimento_id=$1', [attendance!])).rows[0].data).toBe('2026-01-01');
    expect((await owner.query('SELECT count(*)::int AS n FROM ambulatorio.importacao_revisao_aplicacao')).rows[0].n).toBe(0);
  }, 30000);

  it('simula plano em READ ONLY sem mudar tabelas/sequências e detecta token obsoleto após A→B→A', async () => {
    const reviewer = new Pool({ host: process.env.TEST_OWNER_HOST, port: Number(process.env.TEST_OWNER_PORT),
      user: process.env.TEST_REVIEW_DB_USER, password: process.env.TEST_REVIEW_DB_PASSWORD, database: process.env.TEST_CLINICAL_DB });
    const simulate = async (actor = ids.administracao) => {
      const session = await reviewer.connect();
      try {
        await session.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
        const result = (await session.query('SELECT ambulatorio.revisao_simular_decisao($1,$2,$3) AS resultado',
          [temporal.decision,temporal.authorization,actor])).rows[0].resultado;
        await session.query('COMMIT'); return result;
      } catch (error) { await session.query('ROLLBACK'); throw error; }
      finally { session.release(); }
    };
    try {
      const before = await footprint();
      expect(await simulate()).toMatchObject({ resultado: 'apta', codigo: 'revisao_plano_atual',
        quantidadeCampos: 3, quantidadeAlteracoes: 3, quantidadeAlvosNovos: 0, aplicacaoId: null });
      await expect(simulate(ids.edicao)).rejects.toMatchObject({ code: '42501', message: 'revisao_autorizacao_invalida' });
      expect(await footprint()).toEqual(before);
      await expect(reviewer.query('SELECT * FROM ambulatorio.usuario_aplicacao')).rejects.toMatchObject({ code: '42501' });
      await expect(reviewer.query('SELECT * FROM ambulatorio.importacao_revisao_campo')).rejects.toMatchObject({ code: '42501' });
      await expect(reviewer.query("UPDATE ambulatorio.paciente SET nome='Mutacao negada sintetica' WHERE paciente_id=$1", [temporal.target]))
        .rejects.toMatchObject({ code: '42501' });
      const first = await http().get(`/pacientes/${temporal.target}`).auth(tokens.administracao, { type: 'bearer' }).expect(200);
      let version = first.body.versao;
      for (const nome of ['Nome transitorio sintetico cobertura', first.body.nome]) {
        const edited = await http().patch(`/pacientes/${temporal.target}`).auth(tokens.administracao, { type: 'bearer' }).send({ versao: version, nome }).expect(200);
        version = edited.body.versao;
      }
      const nameField = (await owner.query(`SELECT r.campo_id::text,r.ultimo_evento_avaliado_id::text
        FROM ambulatorio.importacao_revisao_campo r JOIN ambulatorio.auditoria_campo c USING(campo_id)
        WHERE r.decisao_id=$1 AND r.registro_id=$2 AND c.tabela_destino='paciente' AND c.coluna_destino='nome'`,
      [temporal.decision,temporal.target])).rows[0];
      const latest = (await owner.query(`SELECT evento_id::text FROM ambulatorio.auditoria_campo_evento
        WHERE campo_id=$1 AND registro_id=$2 ORDER BY versao_campo DESC LIMIT 1`, [nameField.campo_id,temporal.target])).rows[0].evento_id;
      expect(latest).not.toBe(nameField.ultimo_evento_avaliado_id);
      const afterEdit = await footprint();
      expect(await simulate()).toMatchObject({ resultado: 'obsoleta', codigo: 'revisao_alvo_alterado' });
      expect(await footprint()).toEqual(afterEdit);
      expect((await owner.query('SELECT count(*)::int AS n FROM ambulatorio.importacao_revisao_aplicacao')).rows[0].n).toBe(0);
    } finally { await reviewer.end(); }
  }, 30000);

  it('aplica correção seletiva com rollback tardio e dois executores produzem um sucesso', async () => {
    const fields = (await owner.query(`SELECT jsonb_agg(jsonb_build_object(
      'campoId',campo_id,'registroId',registro_id,'alvoChave',alvo_chave,'chaveSemantica',chave_semantica,
      'blocoFuncional',bloco_funcional,'ocorrencia',ocorrencia,'categoria',categoria,'operacao',operacao,'base',base,'proposto',proposto)) AS plano
      FROM ambulatorio.importacao_revisao_campo WHERE decisao_id=$1`, [temporal.decision])).rows[0].plano;
    const session = await owner.connect();
    const competing = await owner.connect();
    let competition: Promise<{ result?: Record<string, unknown>; error?: unknown }> | undefined;
    const beginAsReviewer = async () => {
      await session.query('BEGIN');
      await session.query('SET LOCAL ROLE ambulatorio_servico_autenticado');
      await session.query('SELECT ambulatorio.auditoria_iniciar_aplicacao($1)', [ids.administracao]);
      await session.query('RESET ROLE');
    };
    const counts = async () => (await session.query(`SELECT
      (SELECT count(*)::int FROM ambulatorio.importacao_revisao_aplicacao) AS aplicacoes,
      (SELECT count(*)::int FROM ambulatorio.importacao_revisao_alvo) AS alvos,
      (SELECT count(*)::int FROM ambulatorio.auditoria_campo_evento) AS eventos,
      (SELECT count(*)::int FROM ambulatorio.importacao_registro) AS proveniencia`)).rows[0];
    try {
      await beginAsReviewer();
      await session.query('SET LOCAL ROLE ambulatorio_revisao_servico');
      const successor = (await session.query(`SELECT ambulatorio.revisao_publicar_decisao
        ($1,$2,$3,$4,$5,$6,'autorizar','Reavaliacao sintetica apos edicao',$7::jsonb,$8)::text AS id`,
      [temporal.revision,temporal.revisedLine,temporal.baseLine,temporal.target,temporal.attendance,
        temporal.authorization,JSON.stringify(fields),temporal.decision])).rows[0].id;
      temporal.successor = successor;
      await session.query('COMMIT');
      await beginAsReviewer();
      const before = await counts();
      // Falha no segundo alvo, depois de data/evento do atendimento terem sido escritos.
      if (!/^\d+$/.test(temporal.attendance)) throw new Error('ID sintetico inesperado');
      await session.query(`CREATE FUNCTION pg_temp.recusar_nome_temporal() RETURNS trigger LANGUAGE plpgsql AS $fault$
        BEGIN
          IF NOT EXISTS(SELECT 1 FROM ambulatorio.auditoria_campo_evento e JOIN ambulatorio.auditoria_campo c USING(campo_id)
            WHERE c.tabela_destino='atendimento' AND c.coluna_destino='data_atendimento'
              AND e.registro_id=${temporal.attendance} AND e.origem='revisao') THEN
            RAISE EXCEPTION 'Falha de teste antes da primeira escrita';
          END IF;
          RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Conteudo sintetico restrito que nao deve sair';
        END $fault$;
        CREATE TRIGGER falha_temporal_sintetica BEFORE UPDATE OF nome ON ambulatorio.paciente
          FOR EACH ROW EXECUTE FUNCTION pg_temp.recusar_nome_temporal()`);
      await session.query('SAVEPOINT tentativa_clinica');
      await expect(session.query('SELECT ambulatorio.revisao_aplicar_decisao_interna($1,$2)',
        [successor,temporal.authorization])).rejects.toMatchObject({ code: '23514', message: 'revisao_aplicacao_integridade' });
      await session.query('ROLLBACK TO SAVEPOINT tentativa_clinica');
      expect(await counts()).toEqual(before);
      expect((await session.query('SELECT nome FROM ambulatorio.paciente WHERE paciente_id=$1', [temporal.target])).rows[0].nome).toBe(temporal.beforeName);
      expect((await session.query('SELECT data_atendimento::text AS data FROM ambulatorio.atendimento WHERE atendimento_id=$1', [temporal.attendance])).rows[0].data).toBe('2026-01-01');
      expect((await session.query('SELECT versao_controle::text AS versao FROM ambulatorio.importacao_fonte WHERE fonte_id=$1', [temporal.source])).rows[0].versao).toBe('0');
      await session.query('ROLLBACK'); // Remove tambem a falha sintetica, sem DDL persistente.
      await beginAsReviewer();
      const applied = (await session.query('SELECT ambulatorio.revisao_aplicar_decisao_interna($1,$2) AS resultado',
        [successor,temporal.authorization])).rows[0].resultado;
      expect(applied).toMatchObject({ resultado: 'aplicada', codigo: 'revisao_plano_aplicado', aplicacaoId: expect.any(String) });
      await competing.query('BEGIN');
      await competing.query('SET LOCAL ROLE ambulatorio_servico_autenticado');
      await competing.query('SELECT ambulatorio.auditoria_iniciar_aplicacao($1)', [ids.administracao]);
      await competing.query('RESET ROLE');
      const competingPid = (await competing.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
      competition = competing.query('SELECT ambulatorio.revisao_aplicar_decisao_interna($1,$2) AS resultado',
        [successor,temporal.authorization]).then(result => ({ result: result.rows[0].resultado }), error => ({ error }));
      let blocked = false;
      const deadline = Date.now() + 5000;
      while (!blocked && Date.now() < deadline) {
        blocked = (await owner.query('SELECT cardinality(pg_blocking_pids($1))>0 AS blocked', [competingPid])).rows[0].blocked;
        if (!blocked) await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(blocked).toBe(true);
      await session.query('COMMIT');
      expect(await competition).toMatchObject({ result: { resultado: 'ja_aplicada', aplicacaoId: applied.aplicacaoId } });
      await competing.query('COMMIT');
      expect((await owner.query('SELECT nome FROM ambulatorio.paciente WHERE paciente_id=$1', [temporal.target])).rows[0].nome).toBe(temporal.afterName);
      expect((await owner.query('SELECT data_atendimento::text AS data FROM ambulatorio.atendimento WHERE atendimento_id=$1', [temporal.attendance])).rows[0].data).toBe('2026-01-02');
      expect((await owner.query(`SELECT count(*)::int AS n FROM ambulatorio.auditoria_campo_evento e
        JOIN ambulatorio.importacao_revisao_alvo a USING(revisao_alvo_id)
        WHERE a.aplicacao_id=$1 AND e.origem='revisao' AND e.ator_usuario_id=$2`, [applied.aplicacaoId,ids.administracao])).rows[0].n).toBe(3);
      expect((await owner.query('SELECT observacoes FROM ambulatorio.atendimento WHERE atendimento_id=$1',
        [temporal.attendance])).rows[0].observacoes).toBe('Observacao corrigida sintetica');
      expect((await owner.query(`SELECT versao_controle::text AS versao,revisao_corrente_id::text AS revisao
        FROM ambulatorio.importacao_fonte WHERE fonte_id=$1`, [temporal.source])).rows[0]).toEqual({ versao: '1', revisao: temporal.revision });
      const confirmed = await counts();
      await beginAsReviewer();
      const resumed = (await session.query('SELECT ambulatorio.revisao_aplicar_decisao_interna($1,$2) AS resultado',
        [successor,temporal.authorization])).rows[0].resultado;
      expect(resumed).toMatchObject({ resultado: 'ja_aplicada', aplicacaoId: applied.aplicacaoId });
      await session.query('COMMIT');
      expect(await counts()).toEqual(confirmed);
      expect((await owner.query(`SELECT count(*)::int AS n FROM ambulatorio.importacao_revisao_aplicacao
        WHERE decisao_id=$1 AND resultado='aplicada'`, [successor])).rows[0].n).toBe(1);
      for (const role of ['ambulatorio_revisao_servico','ambulatorio_importador','ambulatorio_aplicacao']) {
        expect((await owner.query("SELECT has_function_privilege($1,'ambulatorio.revisao_aplicar_decisao_interna(bigint,bigint)','EXECUTE') AS permitido", [role])).rows[0].permitido).toBe(false);
      }
    } catch (error) { await session.query('ROLLBACK'); throw error; }
    finally {
      await session.query('ROLLBACK');
      if (competition) await competition;
      await competing.query('ROLLBACK');
      session.release(); competing.release();
    }
  }, 30000);

  it('encerra revisão atribuível, corrige a mesma ocorrência pela base seguinte e preserva o sucesso histórico', async () => {
    const session = await owner.connect();
    const begin = async () => {
      await session.query('BEGIN');
      await session.query('SET LOCAL ROLE ambulatorio_servico_autenticado');
      await session.query('SELECT ambulatorio.auditoria_iniciar_aplicacao($1)', [ids.administracao]);
      await session.query('RESET ROLE');
    };
    try {
      await begin();
      await session.query('SAVEPOINT cancelamento_negado');
      await expect(session.query("SELECT ambulatorio.revisao_terminar_interna($1,$2,'cancelar')",
        [temporal.revision,temporal.authorization])).rejects.toMatchObject({ code: '23514', message: 'revisao_com_efeito_nao_cancelavel' });
      await session.query('ROLLBACK TO SAVEPOINT cancelamento_negado');
      expect((await session.query("SELECT ambulatorio.revisao_terminar_interna($1,$2,'encerrar') AS estado",
        [temporal.revision,temporal.authorization])).rows[0].estado).toBe('concluida');
      await session.query('COMMIT');
      expect((await owner.query(`SELECT e.encerrada_por_usuario_id::text AS ator,e.autorizacao_id::text AS autorizacao,
        e.encerrada_em=r.encerrada_em AS mesmo_instante,l.status_lote
        FROM ambulatorio.importacao_revisao_encerramento e JOIN ambulatorio.importacao_revisao r USING(revisao_id)
        JOIN ambulatorio.importacao_lote l ON l.importacao_lote_id=r.lote_revisado_id WHERE e.revisao_id=$1`, [temporal.revision])).rows[0])
        .toEqual({ ator: ids.administracao, autorizacao: temporal.authorization, mesmo_instante: true, status_lote: 'concluido' });
      await begin();
      expect((await session.query("SELECT ambulatorio.revisao_terminar_interna($1,$2,'encerrar') AS estado",
        [temporal.revision,temporal.authorization])).rows[0].estado).toBe('concluida');
      const previous = (await session.query(`SELECT r.lote_revisado_id,r.layout_revisado,r.manifesto_revisado_sha256,
        p.transformacoes_sha256 FROM ambulatorio.importacao_revisao r JOIN ambulatorio.importacao_revisao_preparacao p USING(revisao_id)
        WHERE r.revisao_id=$1`, [temporal.revision])).rows[0];
      const raw = (await session.query('SELECT dados_brutos FROM ambulatorio.importacao_linha WHERE importacao_linha_id=$1',
        [temporal.revisedLine])).rows[0].dados_brutos as { chave: string; valor: string }[];
      const nextName = 'Paciente segunda correcao sintetica';
      const nextRaw = raw.map(cell => ({ ...cell, valor: cell.chave === 'nome' ? nextName :
        cell.chave === 'data_do_atendimento' ? '03/01/2026' : 'Observacao segunda correcao sintetica' }));
      const lot = (await session.query(`INSERT INTO ambulatorio.importacao_lote
        (codigo_lote,hash_arquivo_sha256,layout_versao,status_lote,manifesto_sha256,importador_versao,revisao_git)
        VALUES('segunda-revisao-sintetica',$1,$2,'pronto',$3,'1.5.0','abcdef0') RETURNING importacao_lote_id`,
      [sha256(canonicalJson(nextRaw)),previous.layout_revisado,previous.manifesto_revisado_sha256])).rows[0].importacao_lote_id;
      const line = (await session.query(`INSERT INTO ambulatorio.importacao_linha
        (importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos)
        VALUES($1,'Sintetica',1,59,$2::jsonb) RETURNING importacao_linha_id`, [lot,JSON.stringify(nextRaw)])).rows[0].importacao_linha_id;
      const fields = (await session.query(`SELECT jsonb_agg(jsonb_build_object(
        'campoId',campo_id,'registroId',registro_id,'alvoChave',alvo_chave,'chaveSemantica',chave_semantica,
        'blocoFuncional',bloco_funcional,'ocorrencia',ocorrencia,'categoria',categoria,'operacao',operacao,'base',proposto,'proposto',proposto)) AS plano
        FROM ambulatorio.importacao_revisao_campo WHERE decisao_id=$1`, [temporal.successor])).rows[0].plano as {
          chaveSemantica: string; proposto: { valor: string }; base: unknown;
        }[];
      for (const field of fields) field.proposto = { ...field.proposto,
        valor: field.chaveSemantica === 'nome' ? nextName : field.chaveSemantica === 'data_do_atendimento' ?
          '2026-01-03' : 'Observacao segunda correcao sintetica' };
      await session.query('SET LOCAL ROLE ambulatorio_revisao_servico');
      const revision = (await session.query('SELECT ambulatorio.revisao_preparar($1,$2,$3,$4,$5)::text AS id',
        [temporal.source,previous.lote_revisado_id,lot,previous.transformacoes_sha256,temporal.authorization])).rows[0].id;
      const decision = (await session.query(`SELECT ambulatorio.revisao_publicar_decisao
        ($1,$2,$3,$4,$5,$6,'autorizar','Mesma ocorrencia conciliada pela base revisada',$7::jsonb)::text AS id`,
      [revision,line,temporal.revisedLine,temporal.target,temporal.attendance,temporal.authorization,JSON.stringify(fields)])).rows[0].id;
      await session.query('COMMIT');
      expect((await owner.query(`SELECT cobertura_historica FROM ambulatorio.importacao_revisao_campo WHERE decisao_id=$1`,
        [decision])).rows.map(row => row.cobertura_historica)).toEqual(['desde_base','desde_base','desde_base']);
      const attendanceCount = (await owner.query('SELECT count(*)::int AS n FROM ambulatorio.atendimento')).rows[0].n;
      await begin();
      expect((await session.query('SELECT ambulatorio.revisao_aplicar_decisao_interna($1,$2) AS resultado',
        [decision,temporal.authorization])).rows[0].resultado.resultado).toBe('aplicada');
      await session.query('COMMIT');
      await begin();
      expect((await session.query("SELECT ambulatorio.revisao_terminar_interna($1,$2,'encerrar') AS estado",
        [revision,temporal.authorization])).rows[0].estado).toBe('concluida');
      await session.query('COMMIT');
      expect((await owner.query('SELECT count(*)::int AS n FROM ambulatorio.atendimento')).rows[0].n).toBe(attendanceCount);
      expect((await owner.query('SELECT versao_controle::text AS versao FROM ambulatorio.importacao_fonte WHERE fonte_id=$1',
        [temporal.source])).rows[0].versao).toBe('2');
      const events = (await owner.query('SELECT count(*)::int AS n FROM ambulatorio.auditoria_campo_evento')).rows[0].n;
      await begin();
      expect((await session.query('SELECT ambulatorio.revisao_aplicar_decisao_interna($1,$2) AS resultado',
        [temporal.successor,temporal.authorization])).rows[0].resultado.resultado).toBe('ja_aplicada');
      await session.query('COMMIT');
      expect((await owner.query('SELECT count(*)::int AS n FROM ambulatorio.auditoria_campo_evento')).rows[0].n).toBe(events);
      expect((await owner.query('SELECT nome FROM ambulatorio.paciente WHERE paciente_id=$1', [temporal.target])).rows[0].nome).toBe(nextName);
      expect((await owner.query('SELECT data_atendimento::text AS data FROM ambulatorio.atendimento WHERE atendimento_id=$1',
        [temporal.attendance])).rows[0].data).toBe('2026-01-03');
    } catch (error) { await session.query('ROLLBACK'); throw error; }
    finally { session.release(); }
  }, 30000);

  it('simula arquivo e plano antes do staging em READ ONLY e rejeita snapshot anterior', async () => {
    const reviewer = new Pool({ host: process.env.TEST_OWNER_HOST, port: Number(process.env.TEST_OWNER_PORT),
      user: process.env.TEST_REVIEW_DB_USER, password: process.env.TEST_REVIEW_DB_PASSWORD, database: process.env.TEST_CLINICAL_DB });
    const source = (await owner.query(`SELECT f.versao_controle::text AS versao,r.lote_revisado_id AS lote,
      p.manifesto_revisado_sha256 AS manifesto,p.transformacoes_sha256 AS transformacoes
      FROM ambulatorio.importacao_fonte f JOIN ambulatorio.importacao_revisao r ON r.revisao_id=f.revisao_corrente_id
      JOIN ambulatorio.importacao_revisao_preparacao p ON p.revisao_id=r.revisao_id
      WHERE f.fonte_id=$1`, [temporal.source])).rows[0];
    const row = (await owner.query(`SELECT importacao_linha_id::text AS id,aba_nome_original AS aba,
      aba_ordem AS ordem,dados_brutos FROM ambulatorio.importacao_linha WHERE importacao_lote_id=$1`, [source.lote])).rows[0];
    const artifacts = (await owner.query(`SELECT sha256,conteudo FROM ambulatorio.revisao_artefato
      WHERE sha256=ANY($1::text[])`, [[source.manifesto, source.transformacoes]])).rows;
    const bytes = (hash: string) => artifacts.find(a => a.sha256 === hash).conteudo as string;
    const fields = (await owner.query(`SELECT c.campo_id::text AS "campoId",c.alvo_chave AS "alvoChave",
      c.registro_id::text AS "registroId",c.chave_semantica AS "chaveSemantica",
      c.bloco_funcional AS "blocoFuncional",c.ocorrencia AS ocorrencia,c.proposto AS base,c.proposto AS proposto
      FROM ambulatorio.importacao_revisao_campo c JOIN ambulatorio.importacao_revisao_decisao d USING(decisao_id)
      JOIN ambulatorio.importacao_revisao r USING(revisao_id)
      WHERE r.lote_revisado_id=$1 ORDER BY c.campo_id`, [source.lote])).rows.map(field => ({
        ...field, categoria: 'sem_mudanca', operacao: 'conservar',
      }));
    expect(fields).toHaveLength(3);
    const line = { linhaBaseId: row.id, pacienteId: temporal.target, atendimentoBaseId: temporal.attendance,
      abaNomeOriginal: row.aba, abaOrdem: row.ordem, numeroLinha: 81, dadosBrutos: row.dados_brutos,
      resultado: 'autorizar', campos: fields };
    const simulate = async (candidate: typeof line & { snapshotSha256?: string }) => {
      const session = await reviewer.connect();
      try {
        await session.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
        const result = (await session.query(`SELECT ambulatorio.revisao_simular_proposta
          ($1,$2,$3,$4,$5,$6,$7::jsonb) AS resultado`, [temporal.source,source.lote,
          temporal.authorization,ids.administracao,bytes(source.manifesto),bytes(source.transformacoes),
          JSON.stringify({ linhas: [candidate] })])).rows[0].resultado;
        await session.query('COMMIT'); return result;
      } catch (error) { await session.query('ROLLBACK'); throw error; }
      finally { session.release(); }
    };
    try {
      const before = await footprint();
      const first = await simulate(line);
      expect(first).toMatchObject({ resultado: 'apta', aptas: 1, conflitos: 0, quantidadeLinhas: 1,
        codigo: 'revisao_simulacao_sem_persistencia', versaoFonte: source.versao });
      expect(first.linhas[0]).toMatchObject({ resultado: 'apta', camposAlterados: 0, alvosNovos: 0,
        snapshotSha256: expect.stringMatching(/^[0-9a-f]{64}$/) });
      expect(await simulate({ ...line, snapshotSha256: first.linhas[0].snapshotSha256 })).toMatchObject({ resultado: 'apta' });
      expect(await footprint()).toEqual(before);
      const changed = { ...line, dadosBrutos: line.dadosBrutos.map((cell: { chave: string; valor: string }) =>
        ({ ...cell, valor: cell.chave === 'nome' ? 'Outra proposta sintética' : cell.valor })) };
      expect(await simulate(changed)).toMatchObject({ resultado: 'conflito', linhas: [
        expect.objectContaining({ codigo: 'revisao_transformacao_divergente' })] });
      expect(await footprint()).toEqual(before);
      const current = await http().get(`/pacientes/${temporal.target}`).auth(tokens.administracao, { type: 'bearer' }).expect(200);
      let version = current.body.versao;
      for (const nome of ['Mudanca transitoria do snapshot sintetico', current.body.nome]) {
        version = (await http().patch(`/pacientes/${temporal.target}`).auth(tokens.administracao, { type: 'bearer' })
          .send({ versao: version, nome }).expect(200)).body.versao;
      }
      const afterEdit = await footprint();
      expect(await simulate({ ...line, snapshotSha256: first.linhas[0].snapshotSha256 }))
        .toMatchObject({ resultado: 'obsoleta', linhas: [expect.objectContaining({ codigo: 'revisao_snapshot_obsoleto' })] });
      expect(await footprint()).toEqual(afterEdit);
      await expect(simulate({ ...line, resultado: null as unknown as string }))
        .rejects.toMatchObject({ code: '23514', message: 'revisao_linha_proposta_invalida' });
    } finally { await reviewer.end(); }
  }, 30000);

  it('cria visitas distintas na mesma data, resolve dependentes e retoma versões sem duplicar efeitos', async () => {
    const session = await owner.connect();
    const competing = await owner.connect();
    let competition: Promise<{ result?: Record<string, unknown>; error?: unknown }> | undefined;
    const begin = async () => {
      await session.query('BEGIN');
      await session.query('SET LOCAL ROLE ambulatorio_servico_autenticado');
      await session.query('SELECT ambulatorio.auditoria_iniciar_aplicacao($1)', [ids.administracao]);
      await session.query('RESET ROLE');
    };
    const sourceRaw = (status: string) => [
      { posicao: 'A', cabecalho: 'Data', chave: 'data_visita', bloco: 'geral', ocorrencia: 1, valor: '05/04/2026' },
      { posicao: 'B', cabecalho: 'Pendencia', chave: 'descricao', bloco: 'geral', ocorrencia: 1, valor: 'Pendencia nova sintetica' },
      { posicao: 'C', cabecalho: 'Status', chave: 'status', bloco: 'geral', ocorrencia: 1, valor: status },
    ];
    const raw = sourceRaw('aberta');
    const manifest = { versao: 'criacao-v1', layout_versao: 'layout-criacao-v1', sheets: [{
      aba_nome_original: 'Sintetica', aba_ordem: 1, columns: raw.map(cell => ({
        posicao_fisica: cell.posicao, cabecalho_original: cell.cabecalho, chave_semantica: cell.chave,
        bloco_funcional: cell.bloco, ocorrencia: cell.ocorrencia,
      })),
    }] };
    const rules = [
      { chave: 'data_visita', bloco: 'geral', ocorrencia: 1, tabela: 'atendimento', coluna: 'data_atendimento', transformacao: 'data_dd_mm_aaaa' },
      { chave: 'observacao_ausente', bloco: 'geral', ocorrencia: 1, tabela: 'atendimento', coluna: 'observacoes', transformacao: 'texto' },
      { chave: 'descricao', bloco: 'geral', ocorrencia: 1, tabela: 'pendencia_atendimento', coluna: 'descricao', transformacao: 'texto' },
      { chave: 'status', bloco: 'geral', ocorrencia: 1, tabela: 'pendencia_atendimento', coluna: 'status_pendencia', transformacao: 'texto' },
    ];
    const manifestBytes = canonicalJson(manifest);
    const transformationBytes = canonicalJson({ formato: 'revisao-transformacoes/v1', regras: rules });
    const envelope = (estado: string, valor: unknown, tipo: string) => ({ estado, valor, tipo_sql: tipo,
      precisao: tipo === 'date' ? 'data_completa' : 'nao_temporal', serializacao_versao: 'v1' });
    let revision: string; let lines: string[]; let decisions: string[]; let fields: unknown[];
    try {
      await begin();
      const catalogs: { campo_id: string; tabela_destino: string; coluna_destino: string; tipo_sql: string }[] = [];
      for (const rule of rules) {
        const found = await session.query(`SELECT campo_id::text,tabela_destino,coluna_destino,tipo_sql
          FROM ambulatorio.auditoria_campo WHERE tabela_destino=$1 AND coluna_destino=$2`, [rule.tabela,rule.coluna]);
        if (found.rows[0]) catalogs.push(found.rows[0]);
        else catalogs.push((await session.query(`INSERT INTO ambulatorio.auditoria_campo
          (tabela_destino,coluna_destino,coluna_pk,tipo_sql,serializacao_versao,captura_desde)
          SELECT $1::text,$2::text,$3::text,format_type(atttypid,atttypmod),'v1',clock_timestamp() FROM pg_attribute
          WHERE attrelid=to_regclass('ambulatorio.'||$1::text) AND attname=$2::text
          RETURNING campo_id::text,tabela_destino,coluna_destino,tipo_sql`,
        [rule.tabela,rule.coluna,rule.tabela === 'atendimento' ? 'atendimento_id' : 'pendencia_atendimento_id'])).rows[0]);
      }
      await session.query(`INSERT INTO ambulatorio.revisao_artefato(sha256,tipo,versao,conteudo)
        VALUES($1,'manifesto','criacao-v1',$2),($3,'transformacoes','criacao-v1',$4)`,
      [sha256(manifestBytes),manifestBytes,sha256(transformationBytes),transformationBytes]);
      const base = (await session.query(`SELECT r.lote_revisado_id FROM ambulatorio.importacao_fonte f
        JOIN ambulatorio.importacao_revisao r ON r.revisao_id=f.revisao_corrente_id WHERE f.fonte_id=$1`,
      [temporal.source])).rows[0].lote_revisado_id;
      const lot = (await session.query(`INSERT INTO ambulatorio.importacao_lote
        (codigo_lote,hash_arquivo_sha256,layout_versao,status_lote,manifesto_sha256,importador_versao,revisao_git)
        VALUES('visitas-novas-sinteticas',$1,'layout-criacao-v1','pronto',$2,'1.5.0','abcdef0') RETURNING importacao_lote_id`,
      [sha256('quatro-visitas-novas-sinteticas'),sha256(manifestBytes)])).rows[0].importacao_lote_id;
      lines = [];
      for (let index = 0; index < 4; index++) lines.push((await session.query(`INSERT INTO ambulatorio.importacao_linha
        (importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos)
        VALUES($1,'Sintetica',1,$2,$3::jsonb) RETURNING importacao_linha_id`,
      [lot,101+index,JSON.stringify(sourceRaw(index === 2 ? 'status_invalido' : 'aberta'))])).rows[0].importacao_linha_id);
      fields = rules.map((rule,index) => ({ campoId: catalogs[index].campo_id, registroId: null,
        alvoChave: rule.tabela === 'atendimento' ? 'visita' : 'pendencia-nova', chaveSemantica: rule.chave,
        blocoFuncional: 'geral', ocorrencia: 1, categoria: 'nova_visita', operacao: 'criar',
        base: envelope('linha_ausente',null,catalogs[index].tipo_sql),
        proposto: envelope(index === 1 ? 'coluna_ausente' : 'valor',
          index === 0 ? '2026-04-05' : index === 1 ? null : index === 2 ? 'Pendencia nova sintetica' : 'aberta',catalogs[index].tipo_sql) }));
      await session.query('SET LOCAL ROLE ambulatorio_revisao_servico');
      revision = (await session.query('SELECT ambulatorio.revisao_preparar($1,$2,$3,$4,$5)::text AS id',
        [temporal.source,base,lot,sha256(transformationBytes),temporal.authorization])).rows[0].id;
      await session.query('SAVEPOINT plano_incompleto');
      await expect(session.query(`SELECT ambulatorio.revisao_publicar_decisao
        ($1,$2,NULL,$3,NULL,$4,'autorizar','Visita distinta comprovada',$5::jsonb)`,
      [revision,lines[0],temporal.target,temporal.authorization,JSON.stringify(fields.filter((_,index) => index !== 1))]))
        .rejects.toMatchObject({ code: '23514', message: 'revisao_criacao_captura_incompleta' });
      await session.query('ROLLBACK TO SAVEPOINT plano_incompleto');
      decisions = [];
      for (let index = 0; index < 3; index++) {
        const plan = index === 2 ? (fields as { chaveSemantica: string; proposto: { valor: unknown } }[])
          .map(field => ({ ...field, proposto: { ...field.proposto,
            valor: field.chaveSemantica === 'status' ? 'status_invalido' : field.proposto.valor } })) : fields;
        decisions.push((await session.query(`SELECT ambulatorio.revisao_publicar_decisao
          ($1,$2,NULL,$3,NULL,$4,'autorizar',$5,$6::jsonb)::text AS id`,
        [revision,lines[index],temporal.target,temporal.authorization,
          `Comparecimento distinto ${index+1} comprovado em fonte sintetica`,JSON.stringify(plan)])).rows[0].id);
      }
      await session.query(`SELECT ambulatorio.revisao_publicar_decisao
        ($1,$2,NULL,NULL,NULL,$3,'bloquear','Sem evidencia de comparecimento','[]'::jsonb)`,
      [revision,lines[3],temporal.authorization]);
      await session.query('COMMIT');
      const baseline = (await owner.query(`SELECT count(*)::int AS n FROM ambulatorio.atendimento`)).rows[0].n;
      const oldPatient = (await owner.query('SELECT nome FROM ambulatorio.paciente WHERE paciente_id=$1', [temporal.target])).rows[0].nome;
      const beforeSimulation = await footprint();
      await session.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      await session.query('SET LOCAL ROLE ambulatorio_revisao_servico');
      expect((await session.query('SELECT ambulatorio.revisao_simular_decisao($1,$2,$3) AS resultado',
        [decisions[0],temporal.authorization,ids.administracao])).rows[0].resultado)
        .toMatchObject({ resultado: 'apta', quantidadeCampos: 4, quantidadeAlvosNovos: 2, aplicacaoId: null });
      await session.query('COMMIT');
      expect(await footprint()).toEqual(beforeSimulation);
      await begin();
      const applied = (await session.query('SELECT ambulatorio.revisao_aplicar_decisao_interna($1,$2) AS resultado',
        [decisions[0],temporal.authorization])).rows[0].resultado;
      expect(applied.resultado).toBe('aplicada');
      await competing.query('BEGIN');
      await competing.query('SET LOCAL ROLE ambulatorio_servico_autenticado');
      await competing.query('SELECT ambulatorio.auditoria_iniciar_aplicacao($1)', [ids.administracao]);
      await competing.query('RESET ROLE');
      const competingPid = (await competing.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
      competition = competing.query('SELECT ambulatorio.revisao_aplicar_decisao_interna($1,$2) AS resultado',
        [decisions[0],temporal.authorization]).then(result => ({ result: result.rows[0].resultado }), error => ({ error }));
      let blocked = false;
      const deadline = Date.now()+5000;
      while (!blocked && Date.now()<deadline) {
        blocked = (await owner.query('SELECT cardinality(pg_blocking_pids($1))>0 AS blocked', [competingPid])).rows[0].blocked;
        if (!blocked) await new Promise(resolve => setTimeout(resolve,10));
      }
      expect(blocked).toBe(true);
      await session.query('COMMIT');
      expect(await competition).toMatchObject({ result: { resultado: 'ja_aplicada', aplicacaoId: applied.aplicacaoId } });
      await competing.query('COMMIT');
      const created = (await owner.query(`SELECT atendimento_criado_id::text AS id FROM ambulatorio.importacao_revisao_aplicacao
        WHERE decisao_id=$1 AND resultado='aplicada'`, [decisions[0]])).rows[0].id;
      expect((await owner.query(`SELECT a.paciente_id::text AS paciente,a.data_atendimento::text AS data,a.observacoes,p.descricao,
        p.status_pendencia FROM ambulatorio.atendimento a JOIN ambulatorio.pendencia_atendimento p USING(atendimento_id)
        WHERE a.atendimento_id=$1`, [created])).rows[0])
        .toEqual({ paciente: temporal.target, data: '2026-04-05', observacoes: null, descricao: 'Pendencia nova sintetica', status_pendencia: 'aberta' });
      expect((await owner.query(`SELECT count(*)::int AS n FROM ambulatorio.auditoria_campo_evento e
        JOIN ambulatorio.importacao_revisao_alvo a USING(revisao_alvo_id)
        JOIN ambulatorio.importacao_revisao_aplicacao ap USING(aplicacao_id)
        WHERE ap.decisao_id=$1 AND e.origem='revisao' AND e.antes->>'estado'='alvo_ausente' AND e.versao_campo=1`,
      [decisions[0]])).rows[0].n).toBe(4);
      await begin();
      await session.query('SAVEPOINT incompleta');
      await expect(session.query("SELECT ambulatorio.revisao_terminar_interna($1,$2,'encerrar')",
        [revision,temporal.authorization])).rejects.toMatchObject({ code: '23514', message: 'revisao_linhas_nao_contabilizadas' });
      await session.query('ROLLBACK TO SAVEPOINT incompleta');
      await session.query('SET LOCAL ROLE ambulatorio_revisao_servico');
      for (const invalid of [
        { patient: otherId, plan: fields, code: 'revisao_mapeamento_com_efeito_incompativel' },
        { patient: temporal.target, plan: (fields as { alvoChave: string }[]).map(field => ({ ...field,
          alvoChave: field.alvoChave === 'visita' ? 'visita-renomeada' : field.alvoChave })), code: 'revisao_visita_ja_resolvida' },
        { patient: temporal.target, plan: (fields as { alvoChave: string }[]).map(field => ({ ...field,
          alvoChave: field.alvoChave === 'pendencia-nova' ? 'dependente-renomeado' : field.alvoChave })), code: 'revisao_alvo_criado_renomeado' },
      ]) {
        await session.query('SAVEPOINT identidade_resolvida');
        await expect(session.query(`SELECT ambulatorio.revisao_publicar_decisao
          ($1,$2,NULL,$3,NULL,$4,'autorizar','Tentativa sintetica de mudar identidade',$5::jsonb,$6)`,
        [revision,lines[0],invalid.patient,temporal.authorization,JSON.stringify(invalid.plan),decisions[0]]))
          .rejects.toMatchObject({ code: '23514', message: invalid.code });
        await session.query('ROLLBACK TO SAVEPOINT identidade_resolvida');
      }
      const successor = (await session.query(`SELECT ambulatorio.revisao_publicar_decisao
        ($1,$2,NULL,$3,NULL,$4,'autorizar','Versao seguinte conserva a visita ja confirmada',$5::jsonb,$6)::text AS id`,
      [revision,lines[0],temporal.target,temporal.authorization,JSON.stringify(fields),decisions[0]])).rows[0].id;
      await session.query('COMMIT');
      const events = (await owner.query('SELECT count(*)::int AS n FROM ambulatorio.auditoria_campo_evento')).rows[0].n;
      await begin();
      expect((await session.query('SELECT ambulatorio.revisao_aplicar_decisao_interna($1,$2) AS resultado',
        [successor,temporal.authorization])).rows[0].resultado.resultado).toBe('aplicada');
      await session.query('COMMIT');
      expect((await owner.query('SELECT count(*)::int AS n FROM ambulatorio.atendimento')).rows[0].n).toBe(baseline+1);
      expect((await owner.query('SELECT count(*)::int AS n FROM ambulatorio.auditoria_campo_evento')).rows[0].n).toBe(events);
      expect((await owner.query(`SELECT atendimento_criado_id::text AS id FROM ambulatorio.importacao_revisao_aplicacao
        WHERE decisao_id=$1 AND resultado='aplicada'`, [successor])).rows[0].id).toBe(created);
      await begin();
      expect((await session.query('SELECT ambulatorio.revisao_aplicar_decisao_interna($1,$2) AS resultado',
        [decisions[1],temporal.authorization])).rows[0].resultado.resultado).toBe('aplicada');
      await session.query('COMMIT');
      const effects = (await owner.query(`SELECT (SELECT count(*) FROM ambulatorio.atendimento)::int AS atendimentos,
        (SELECT count(*) FROM ambulatorio.importacao_registro)::int AS proveniencias,
        (SELECT count(*) FROM ambulatorio.auditoria_campo_evento)::int AS eventos,
        (SELECT count(*) FROM ambulatorio.importacao_revisao_aplicacao)::int AS aplicacoes`)).rows[0];
      expect(effects.atendimentos).toBe(baseline+2);
      await begin();
      await expect(session.query('SELECT ambulatorio.revisao_aplicar_decisao_interna($1,$2)',
        [decisions[2],temporal.authorization])).rejects.toMatchObject({ code: '23514', message: 'revisao_aplicacao_integridade' });
      await expect(session.query('SELECT ambulatorio.revisao_registrar_falha_interna($1,$2,$3)',
        [decisions[2],temporal.authorization,'23514'])).rejects.toMatchObject({ code: '25P02' });
      await session.query('ROLLBACK');
      expect((await owner.query(`SELECT (SELECT count(*) FROM ambulatorio.atendimento)::int AS atendimentos,
        (SELECT count(*) FROM ambulatorio.importacao_registro)::int AS proveniencias,
        (SELECT count(*) FROM ambulatorio.auditoria_campo_evento)::int AS eventos,
        (SELECT count(*) FROM ambulatorio.importacao_revisao_aplicacao)::int AS aplicacoes`)).rows[0]).toEqual(effects);
      await begin();
      await session.query('SAVEPOINT codigo_restrito');
      await expect(session.query('SELECT ambulatorio.revisao_registrar_falha_interna($1,$2,$3)',
        [decisions[2],temporal.authorization,'Mensagem sintetica restrita']))
        .rejects.toMatchObject({ code: '23514', message: 'revisao_diagnostico_nao_homologado' });
      await session.query('ROLLBACK TO SAVEPOINT codigo_restrito');
      const diagnosis = (await session.query('SELECT ambulatorio.revisao_registrar_falha_interna($1,$2,$3) AS resultado',
        [decisions[2],temporal.authorization,'23514'])).rows[0].resultado;
      expect(diagnosis).toEqual({ resultado: 'falha_registrada', codigo: 'revisao_aplicacao_integridade', tentativaId: expect.any(String) });
      await session.query('COMMIT');
      expect((await owner.query(`SELECT ap.resultado,ap.codigo_resultado,c.ator_usuario_id::text AS ator,c.origem,
        ap.executor_db=c.principal_db AS mesmo_principal,ap.atendimento_criado_id
        FROM ambulatorio.importacao_revisao_aplicacao ap JOIN ambulatorio.auditoria_contexto_transacao c
          ON c.transacao_id=ap.publicacao_xid WHERE ap.aplicacao_id=$1`, [diagnosis.tentativaId])).rows[0])
        .toEqual({ resultado: 'falha_operacional', codigo_resultado: 'revisao_aplicacao_integridade', ator: ids.administracao,
          origem: 'aplicacao', mesmo_principal: true, atendimento_criado_id: null });
      expect((await owner.query(`SELECT (SELECT count(*) FROM ambulatorio.atendimento)::int AS atendimentos,
        (SELECT count(*) FROM ambulatorio.importacao_registro)::int AS proveniencias,
        (SELECT count(*) FROM ambulatorio.auditoria_campo_evento)::int AS eventos,
        (SELECT count(*) FROM ambulatorio.importacao_revisao_aplicacao)::int AS aplicacoes`)).rows[0])
        .toEqual({ ...effects, aplicacoes: effects.aplicacoes+1 });
      for (const role of ['ambulatorio_revisao_servico','ambulatorio_importador','ambulatorio_aplicacao']) {
        expect((await owner.query("SELECT has_function_privilege($1,'ambulatorio.revisao_registrar_falha_interna(bigint,bigint,text)','EXECUTE') AS permitido", [role])).rows[0].permitido).toBe(false);
        expect((await owner.query("SELECT has_function_privilege($1,'ambulatorio.revisao_resolver_alvos(bigint)','EXECUTE') AS permitido", [role])).rows[0].permitido).toBe(false);
      }
      await begin();
      await session.query('SET LOCAL ROLE ambulatorio_revisao_servico');
      await session.query(`SELECT ambulatorio.revisao_publicar_decisao
        ($1,$2,NULL,NULL,NULL,$3,'bloquear','Status da pendencia exige nova decisao','[]'::jsonb,$4)`,
      [revision,lines[2],temporal.authorization,decisions[2]]);
      await session.query('COMMIT');
      await begin();
      expect((await session.query("SELECT ambulatorio.revisao_terminar_interna($1,$2,'encerrar') AS estado",
        [revision,temporal.authorization])).rows[0].estado).toBe('concluida_com_pendencias');
      await session.query('COMMIT');
      expect((await owner.query('SELECT nome FROM ambulatorio.paciente WHERE paciente_id=$1', [temporal.target])).rows[0].nome).toBe(oldPatient);
      expect((await owner.query(`SELECT count(*)::int AS n FROM ambulatorio.atendimento WHERE paciente_id=$1 AND data_atendimento='2026-04-05'`,
        [temporal.target])).rows[0].n).toBe(2);
      expect((await owner.query('SELECT ambulatorio.revisao_cobertura_base($1,$2,$3,$4::jsonb) AS cobertura',
        [lines[0],(fields[0] as { campoId: string }).campoId,created,JSON.stringify(envelope('valor','2026-04-05','date'))])).rows[0].cobertura).toBe('desde_base');
      Object.assign(temporal, { creationLine: lines[0], creationAttendance: created,
        dateField: (fields[0] as { campoId: string }).campoId });
      await begin();
      await session.query('SET LOCAL ROLE ambulatorio_revisao_servico');
      await expect(session.query(`SELECT ambulatorio.revisao_publicar_decisao
        ($1,$2,NULL,$3,NULL,$4,'autorizar','Aprovacao tardia recusada',$5::jsonb,$6)`,
      [revision,lines[0],temporal.target,temporal.authorization,JSON.stringify(fields),successor]))
        .rejects.toMatchObject({ code: '23514', message: 'revisao_base_obsoleta' });
      await session.query('ROLLBACK');
    } catch (error) { await session.query('ROLLBACK'); throw error; }
    finally {
      await session.query('ROLLBACK');
      if (competition) await competition;
      await competing.query('ROLLBACK');
      session.release(); competing.release();
    }
  }, 30000);

  it('ordena revisões concorrentes, preserva edição posterior e serializa revogação com aplicação', async () => {
    const first = await owner.connect(); const second = await owner.connect();
    let pending: Promise<{ result?: Record<string, unknown>; error?: unknown }> | undefined;
    let baseLine = temporal.creationLine;
    const begin = async (client: typeof first) => {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE ambulatorio_servico_autenticado');
      await client.query('SELECT ambulatorio.auditoria_iniciar_aplicacao($1)', [ids.administracao]);
      await client.query('RESET ROLE');
    };
    const waitForLock = async () => {
      const pid = (await owner.query(`SELECT pid FROM pg_stat_activity
        WHERE datname=current_database() AND wait_event_type='Lock'
          AND query LIKE '%revisao_%' AND pid<>pg_backend_pid() ORDER BY pid LIMIT 1`)).rows[0]?.pid;
      return pid !== undefined && (await owner.query('SELECT cardinality(pg_blocking_pids($1))>0 AS waiting', [pid])).rows[0].waiting;
    };
    const assertWaiting = async () => {
      let waiting = false; const deadline = Date.now()+5000;
      while (!waiting && Date.now()<deadline) {
        waiting = await waitForLock();
        if (!waiting) await new Promise(resolve => setTimeout(resolve,10));
      }
      expect(waiting).toBe(true);
    };
    const prepare = async (code: string, date: string) => {
      await begin(first);
      const base = (await first.query(`SELECT r.lote_revisado_id,r.layout_revisado,r.manifesto_revisado_sha256,p.transformacoes_sha256
        FROM ambulatorio.importacao_fonte f JOIN ambulatorio.importacao_revisao r ON r.revisao_id=f.revisao_corrente_id
        JOIN ambulatorio.importacao_revisao_preparacao p ON p.revisao_id=r.revisao_id WHERE f.fonte_id=$1`, [temporal.source])).rows[0];
      const original = (await first.query('SELECT dados_brutos FROM ambulatorio.importacao_linha WHERE importacao_linha_id=$1',
        [baseLine])).rows[0].dados_brutos as { chave: string; valor: string }[];
      const raw = original.map(cell => ({ ...cell, valor: cell.chave === 'data_visita' ? date : cell.valor }));
      const lot = (await first.query(`INSERT INTO ambulatorio.importacao_lote
        (codigo_lote,hash_arquivo_sha256,layout_versao,status_lote,manifesto_sha256,importador_versao,revisao_git)
        VALUES($1,$2,$3,'pronto',$4,'1.5.0','abcdef0') RETURNING importacao_lote_id`,
      [code,sha256(canonicalJson(raw)),base.layout_revisado,base.manifesto_revisado_sha256])).rows[0].importacao_lote_id;
      const line = (await first.query(`INSERT INTO ambulatorio.importacao_linha
        (importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos)
        VALUES($1,'Sintetica',1,101,$2::jsonb) RETURNING importacao_linha_id`, [lot,JSON.stringify(raw)])).rows[0].importacao_linha_id;
      const envelope = (value: string) => ({ estado: 'valor', valor: value.split('/').reverse().join('-'), tipo_sql: 'date',
        precisao: 'data_completa', serializacao_versao: 'v1' });
      const fields = [{ campoId: temporal.dateField, registroId: temporal.creationAttendance, alvoChave: 'visita',
        chaveSemantica: 'data_visita', blocoFuncional: 'geral', ocorrencia: 1, categoria: 'correcao_ocorrencia', operacao: 'definir',
        base: envelope(original.find(cell => cell.chave === 'data_visita')!.valor), proposto: envelope(date) }];
      await first.query('SET LOCAL ROLE ambulatorio_revisao_servico');
      const revision = (await first.query('SELECT ambulatorio.revisao_preparar($1,$2,$3,$4,$5)::text AS id',
        [temporal.source,base.lote_revisado_id,lot,base.transformacoes_sha256,temporal.authorization])).rows[0].id;
      const decision = (await first.query(`SELECT ambulatorio.revisao_publicar_decisao
        ($1,$2,$3,$4,$5,$6,'autorizar','Correcao da mesma ocorrencia comprovada sinteticamente',$7::jsonb)::text AS id`,
      [revision,line,baseLine,temporal.target,temporal.creationAttendance,temporal.authorization,JSON.stringify(fields)])).rows[0].id;
      await first.query('COMMIT'); return { revision, decision, line };
    };
    const currentDate = async () => (await owner.query('SELECT data_atendimento::text AS data FROM ambulatorio.atendimento WHERE atendimento_id=$1',
      [temporal.creationAttendance])).rows[0].data;
    const close = async (revision: string) => {
      await begin(first);
      await first.query("SELECT ambulatorio.revisao_terminar_interna($1,$2,'encerrar')", [revision,temporal.authorization]);
      await first.query('COMMIT');
    };
    try {
      const winner = await prepare('concorrente-vencedora','06/04/2026');
      const loser = await prepare('concorrente-obsoleta','07/04/2026');
      await begin(first);
      expect((await first.query('SELECT ambulatorio.revisao_aplicar_decisao_interna($1,$2) AS resultado',
        [winner.decision,temporal.authorization])).rows[0].resultado.resultado).toBe('aplicada');
      await begin(second);
      pending = second.query('SELECT ambulatorio.revisao_aplicar_decisao_interna($1,$2) AS resultado',
        [loser.decision,temporal.authorization]).then(r => ({ result: r.rows[0].resultado }), error => ({ error }));
      await assertWaiting(); await first.query('COMMIT');
      expect(await pending).toMatchObject({ result: { resultado: 'obsoleta', codigo: 'revisao_base_obsoleta' } });
      await second.query('COMMIT');
      expect(await currentDate()).toBe('2026-04-06');
      await close(winner.revision); baseLine = winner.line;
      await begin(first);
      expect((await first.query("SELECT ambulatorio.revisao_terminar_interna($1,$2,'cancelar') AS estado",
        [loser.revision,temporal.authorization])).rows[0].estado).toBe('cancelada');
      await first.query('COMMIT');

      const stale = await prepare('concorrente-edicao','08/04/2026');
      const path = `/pacientes/${temporal.target}/atendimentos/${temporal.creationAttendance}`;
      let attendance = await http().get(path).auth(tokens.administracao, { type: 'bearer' }).expect(200);
      await http().patch(path).auth(tokens.administracao, { type: 'bearer' })
        .send({ versao: attendance.body.versao, dataAtendimento: '2026-04-09' }).expect(200);
      await begin(first);
      expect((await first.query('SELECT ambulatorio.revisao_aplicar_decisao_interna($1,$2) AS resultado',
        [stale.decision,temporal.authorization])).rows[0].resultado)
        .toMatchObject({ resultado: 'obsoleta', codigo: 'revisao_alvo_alterado' });
      await first.query('COMMIT'); expect(await currentDate()).toBe('2026-04-09');
      attendance = await http().get(path).auth(tokens.administracao, { type: 'bearer' }).expect(200);
      await http().patch(path).auth(tokens.administracao, { type: 'bearer' })
        .send({ versao: attendance.body.versao, dataAtendimento: '2026-04-06' }).expect(200);

      const authorized = await prepare('concorrente-revogacao-depois','10/04/2026');
      await begin(first);
      await first.query('SELECT ambulatorio.revisao_aplicar_decisao_interna($1,$2)', [authorized.decision,temporal.authorization]);
      await begin(second); await second.query('SET LOCAL ROLE ambulatorio_revisao_gestor');
      pending = second.query('SELECT ambulatorio.revisao_revogar_autorizacao($1)', [temporal.authorization])
        .then(() => ({ result: { revoked: true } }), error => ({ error }));
      await assertWaiting(); await first.query('COMMIT');
      expect(await pending).toEqual({ result: { revoked: true } }); await second.query('COMMIT');
      expect(await currentDate()).toBe('2026-04-10');
      await begin(first);
      await expect(first.query('SELECT ambulatorio.revisao_aplicar_decisao_interna($1,$2)', [authorized.decision,temporal.authorization]))
        .rejects.toMatchObject({ code: '42501', message: 'revisao_autorizacao_invalida' });
      await first.query('ROLLBACK');
      await begin(first); await first.query('SET LOCAL ROLE ambulatorio_revisao_gestor');
      temporal.authorization = (await first.query('SELECT ambulatorio.revisao_conceder_autorizacao($1,$2)::text AS id',
        [temporal.source,ids.administracao])).rows[0].id;
      await first.query('COMMIT'); await close(authorized.revision); baseLine = authorized.line;

      const refused = await prepare('concorrente-revogacao-antes','11/04/2026');
      await begin(first); await first.query('SET LOCAL ROLE ambulatorio_revisao_gestor');
      await first.query('SELECT ambulatorio.revisao_revogar_autorizacao($1)', [temporal.authorization]);
      await begin(second);
      pending = second.query('SELECT ambulatorio.revisao_aplicar_decisao_interna($1,$2) AS resultado',
        [refused.decision,temporal.authorization]).then(r => ({ result: r.rows[0].resultado }), error => ({ error }));
      await assertWaiting(); await first.query('COMMIT');
      expect(await pending).toMatchObject({ error: { code: '42501', message: 'revisao_autorizacao_invalida' } });
      await second.query('ROLLBACK'); expect(await currentDate()).toBe('2026-04-10');
      expect((await owner.query(`SELECT count(*)::int AS n FROM ambulatorio.importacao_revisao_aplicacao
        WHERE decisao_id=$1 AND resultado='aplicada'`, [refused.decision])).rows[0].n).toBe(0);
    } finally {
      await first.query('ROLLBACK'); if (pending) await pending; await second.query('ROLLBACK');
      first.release(); second.release();
    }
  }, 30000);

  it('exige contexto no login operacional configurado para o role do importador', async () => {
    await owner.query(`INSERT INTO ambulatorio.auditoria_campo
      (tabela_destino,coluna_destino,coluna_pk,tipo_sql,serializacao_versao,captura_desde)
      VALUES('paciente','nome','paciente_id','character varying(255)','v1',clock_timestamp())
      ON CONFLICT(tabela_destino,coluna_destino) DO NOTHING`);
    const capture = await owner.query(`SELECT captura_desde IS NOT NULL AS ativa FROM ambulatorio.auditoria_campo
      WHERE tabela_destino='paciente' AND coluna_destino='nome'`);
    expect(capture.rows[0]?.ativa).toBe(true);
    const importer = new Pool({ host: process.env.IMPORT_DB_HOST, port: Number(process.env.IMPORT_DB_PORT),
      user: process.env.IMPORT_DB_USER, password: process.env.IMPORT_DB_PASSWORD, database: process.env.TEST_CLINICAL_DB,
      options: '-c role=ambulatorio_importador' });
    try {
      const identity = await importer.query('SELECT current_user AS principal, current_setting(\'role\') AS role');
      expect(identity.rows[0]).toEqual({ principal: 'ambulatorio_importador', role: 'ambulatorio_importador' });
      await expect(importer.query("INSERT INTO ambulatorio.paciente(nome) VALUES('Importador sem contexto sintetico')"))
        .rejects.toMatchObject({ code: '42501', message: 'auditoria_importador_sem_contexto' });
    } finally { await importer.end(); }
  });

  it('serializa inclusão de linha com o congelamento da fonte em duas sessões', async () => {
    const first = await owner.connect(); const second = await owner.connect();
    let insertion: Promise<unknown> | undefined;
    try {
      const p = (await owner.query("INSERT INTO ambulatorio.paciente(nome) VALUES('Paciente congelamento sintetico') RETURNING paciente_id")).rows[0].paciente_id;
      const a = (await owner.query("INSERT INTO ambulatorio.atendimento(paciente_id,data_atendimento) VALUES($1,'2026-01-01') RETURNING atendimento_id", [p])).rows[0].atendimento_id;
      const lot = (await owner.query(`INSERT INTO ambulatorio.importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote)
        VALUES('congelamento-sintetico',$1,'v1','concluido') RETURNING importacao_lote_id`, ['9'.repeat(64)])).rows[0].importacao_lote_id;
      const line = (await owner.query(`INSERT INTO ambulatorio.importacao_linha
        (importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha)
        VALUES($1,'Sintetica',1,2,'[]','importada') RETURNING importacao_linha_id`, [lot])).rows[0].importacao_linha_id;
      await owner.query(`INSERT INTO ambulatorio.importacao_registro(importacao_linha_id,tabela_destino,registro_id,acao)
        VALUES($1,'paciente',$2,'criado'),($1,'atendimento',$3,'criado')`, [line,p,a]);
      await first.query('BEGIN');
      await first.query('SET LOCAL ROLE ambulatorio_servico_autenticado');
      await first.query('SELECT ambulatorio.auditoria_iniciar_aplicacao($1)', [ids.administracao]);
      await first.query('SET LOCAL ROLE ambulatorio_revisao_gestor');
      await first.query("SELECT ambulatorio.revisao_registrar_fonte('fonte-congelamento-sintetico',$1)", [lot]);
      const pid = (await second.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
      // Convert rejection immediately to a result, avoiding an unhandled promise.
      insertion = second.query(`INSERT INTO ambulatorio.importacao_linha
        (importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos)
        VALUES($1,'Sintetica',1,3,'[]')`, [lot]).then(() => ({ accepted: true }), error => ({ error }));
      let blocked = false;
      const deadline = Date.now() + 5000;
      while (!blocked && Date.now() < deadline) {
        blocked = (await owner.query('SELECT cardinality(pg_blocking_pids($1))>0 AS blocked', [pid])).rows[0].blocked;
        if (!blocked) await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(blocked).toBe(true);
      await first.query('COMMIT');
      expect(await insertion).toMatchObject({ error: { code: '23514', message: 'revisao_conjunto_linhas_congelado' } });
      expect((await owner.query('SELECT count(*)::int AS n FROM ambulatorio.importacao_linha WHERE importacao_lote_id=$1', [lot])).rows[0].n).toBe(1);
    } finally {
      await first.query('ROLLBACK');
      if (insertion) await insertion;
      first.release(); second.release();
    }
  }, 15000);
  it('ordena histórico por data decrescente, nulos por último e ID decrescente nas três leituras', async () => {
    // Legado importado admite data desconhecida, mesmo quando a escrita HTTP
    // de novos atendimentos exige data. A fixture owner reproduz esse contrato.
    const patient = (await owner.query(`INSERT INTO ambulatorio.paciente(nome)
      VALUES('Histórico temporal de teste') RETURNING paciente_id::text`)).rows[0].paciente_id;
    for (const perfil of ['consulta', 'edicao']) await owner.query(`INSERT INTO ambulatorio.acesso_paciente
      (paciente_id,usuario_id,pode_editar,concedido_por_usuario_id) VALUES($1,$2,$3,$4)`,
      [patient, ids[perfil], perfil === 'edicao', ids.administracao]);
    const dates = [null, '2025-12-01', '2026-01-01', '2026-01-01', null];
    const records: Array<{ atendimentoId: string; dataAtendimento: string | null }> = [];
    for (const [index, date] of dates.entries()) {
      // Crossing a decimal-width boundary catches ORDER BY resolving the
      // text-cast output alias instead of the underlying bigint column.
      const id = (999999999999999997n + BigInt(index)).toString();
      const row = (await owner.query(`INSERT INTO ambulatorio.atendimento(atendimento_id,paciente_id,data_atendimento)
        VALUES($1::bigint,$2,$3::date) RETURNING atendimento_id::text`, [id, patient, date])).rows[0];
      records.push({ atendimentoId: row.atendimento_id, dataAtendimento: date });
    }
    const expected = [records[3], records[2], records[1], records[4], records[0]];
    const summary = (rows: Array<{ atendimentoId: string; dataAtendimento: string | null }>) => rows.map(row => ({
      atendimentoId: row.atendimentoId, dataAtendimento: row.dataAtendimento,
    }));
    for (const perfil of ['consulta', 'edicao', 'administracao']) {
      const full = await http().get(`/pacientes/${patient}/atendimentos?limit=100`)
        .auth(tokens[perfil], { type: 'bearer' }).expect(200);
      expect(summary(full.body)).toEqual(expected);
      for (const offset of [0, 2, 4, 6]) {
        const query = `limit=2&offset=${offset}`;
        const page = await http().get(`/pacientes/${patient}/atendimentos?${query}`)
          .auth(tokens[perfil], { type: 'bearer' }).expect(200);
        const detail = await http().get(`/pacientes/${patient}?${query}`)
          .auth(tokens[perfil], { type: 'bearer' }).expect(200);
        expect(summary(page.body)).toEqual(expected.slice(offset, offset + 2));
        expect(summary(detail.body.atendimentos)).toEqual(expected.slice(offset, offset + 2));
      }
      for (const record of records) {
        const detail = await http().get(`/pacientes/${patient}/atendimentos/${record.atendimentoId}`)
          .auth(tokens[perfil], { type: 'bearer' }).expect(200);
        expect(detail.body).toMatchObject(record);
      }
    }
    const legacyPath = `/pacientes/${patient}/atendimentos/${records[0]!.atendimentoId}`;
    const before = (await http().get(legacyPath).auth(tokens.edicao, { type: 'bearer' }).expect(200)).body;
    const patch = { versao: before.versao, observacoes: 'Observação legada corrigida sem estimar data' };
    await http().patch(legacyPath).auth(tokens.consulta, { type: 'bearer' }).send(patch).expect(403);
    const saved = (await http().patch(legacyPath).auth(tokens.edicao, { type: 'bearer' }).send(patch).expect(200)).body;
    expect(saved.versao).toBe((BigInt(before.versao) + 1n).toString());
    await http().patch(legacyPath).auth(tokens.edicao, { type: 'bearer' }).send(patch).expect(409);
    const after = (await http().get(legacyPath).auth(tokens.administracao, { type: 'bearer' }).expect(200)).body;
    expect(after).toMatchObject({ dataAtendimento: null, observacoes: patch.observacoes, versao: saved.versao });
  });


});
