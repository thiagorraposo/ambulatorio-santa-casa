import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';

const suite = process.env.TEST_CLINICAL_DB ? describe : describe.skip;

suite('Recursos clínicos HTTP no banco descartável', () => {
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
      const result = await owner.query(`INSERT INTO ambulatorio.usuario_aplicacao(nome,login,senha_hash,perfil)
        VALUES($1,$2,$3,$4) RETURNING usuario_id::text`, [perfil, `recursos-${perfil}@example.invalid`,
        '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK', perfil]);
      ids[perfil] = result.rows[0].usuario_id;
    }
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication(); configureApp(app); await app.init();
    for (const perfil of Object.keys(ids)) tokens[perfil] = await app.get(JwtService).signAsync({ sub: ids[perfil], typ: 'access' });
    const patient = await http().post('/pacientes').auth(tokens.administracao, { type: 'bearer' })
      .send({ nome: 'Paciente Recursos Sintético' }).expect(201);
    patientId = patient.body.pacienteId;
    otherId = (await http().post('/pacientes').auth(tokens.administracao, { type: 'bearer' })
      .send({ nome: 'Outro Paciente Recursos Sintético' }).expect(201)).body.pacienteId;
    for (const perfil of ['consulta', 'edicao']) await http().put(`/pacientes/${patientId}/acesso/${ids[perfil]}`)
      .auth(tokens.administracao, { type: 'bearer' }).send({ ativo: true, podeEditar: perfil === 'edicao' }).expect(200);
    attendanceId = (await http().post(`/pacientes/${patientId}/atendimentos`)
      .auth(tokens.edicao, { type: 'bearer' }).send({ dataAtendimento: '2026-02-01' }).expect(201)).body.atendimentoId;
  });
  afterAll(async () => { await app?.close(); await owner?.end(); });

  it('registra projetos e notificação sem apagar campos omitidos', async () => {
    const project = await owner.query(`SELECT projeto_estudo_id::text FROM ambulatorio.projeto_estudo WHERE ativo ORDER BY projeto_estudo_id LIMIT 1`);
    const projetoId = project.rows[0].projeto_estudo_id;
    await http().put(`/pacientes/${patientId}/projetos`).auth(tokens.consulta, { type: 'bearer' })
      .send({ projetoId, participa: true }).expect(403);
    await http().put(`/pacientes/${otherId}/projetos`).auth(tokens.edicao, { type: 'bearer' })
      .send({ projetoId, participa: true }).expect(403);
    await http().put(`/pacientes/${patientId}/projetos`).auth(tokens.edicao, { type: 'bearer' })
      .send({ projetoId, participa: true, possuiPendencia: null }).expect(200);
    await http().put(`/pacientes/${patientId}/projetos`).auth(tokens.edicao, { type: 'bearer' })
      .send({ projetoId, descricaoPendencia: 'Texto sintético' }).expect(200);
    const projects = await http().get(`/pacientes/${patientId}/projetos?limit=1`).auth(tokens.consulta, { type: 'bearer' }).expect(200);
    expect(projects.body[0]).toMatchObject({ projetoId, participa: true, possuiPendencia: null,
      descricaoPendencia: 'Texto sintético' });
    await http().put(`/pacientes/${patientId}/notificacao`).auth(tokens.edicao, { type: 'bearer' })
      .send({ pacienteNotificado: false, justificativaNaoNotificacao: 'Justificativa sintética' }).expect(200);
    await http().put(`/pacientes/${patientId}/notificacao`).auth(tokens.edicao, { type: 'bearer' })
      .send({ observacoes: 'Observação sintética' }).expect(200);
    const notification = await http().get(`/pacientes/${patientId}/notificacao`).auth(tokens.consulta, { type: 'bearer' }).expect(200);
    expect(notification.body).toMatchObject({ pacienteNotificado: false,
      justificativaNaoNotificacao: 'Justificativa sintética', observacoes: 'Observação sintética' });
  });

  it('registra encaminhamento e duas contrarreferências como episódios separados', async () => {
    const referralPath = `/pacientes/${patientId}/encaminhamentos`;
    await http().post(referralPath).auth(tokens.consulta, { type: 'bearer' })
      .send({ atendimentoId: attendanceId, destinoNome: 'Unidade sintética' }).expect(403);
    const referral = await http().post(referralPath).auth(tokens.edicao, { type: 'bearer' })
      .send({ atendimentoId: attendanceId, destinoNome: 'Unidade sintética', status: 'solicitado', documentoApresentado: null }).expect(201);
    const id = referral.body.encaminhamentoId;
    const episodes = `${referralPath}/${id}/contrarreferencias`;
    await http().post(episodes).auth(tokens.edicao, { type: 'bearer' })
      .send({ status: 'pendente', resumo: 'Aguardando resposta sintética' }).expect(201);
    await http().post(episodes).auth(tokens.edicao, { type: 'bearer' })
      .send({ status: 'concluido', dataRealizada: '2026-03-10', resumo: 'Resposta sintética' }).expect(201);
    const list = await http().get(`${episodes}?limit=1`).auth(tokens.consulta, { type: 'bearer' }).expect(200);
    const next = await http().get(`${episodes}?limit=1&offset=1`).auth(tokens.consulta, { type: 'bearer' }).expect(200);
    expect(list.body).toHaveLength(1); expect(next.body).toHaveLength(1);
    expect(list.body[0].contrarreferenciaId).not.toBe(next.body[0].contrarreferenciaId);
    expect(list.body[0].dataRealizada).toBe('2026-03-10');
    expect(next.body[0].dataRealizada).toBeNull();
    const referrals = await http().get(`${referralPath}?status=solicitado`).auth(tokens.consulta, { type: 'bearer' }).expect(200);
    expect(referrals.body[0]).toMatchObject({ encaminhamentoId: id, atendimentoId: attendanceId, documentoApresentado: null });
    await http().get(`${referralPath}?status=inventado`).auth(tokens.consulta, { type: 'bearer' }).expect(400);
    await http().get(`/pacientes/${otherId}/encaminhamentos/${id}/contrarreferencias`)
      .auth(tokens.administracao, { type: 'bearer' }).expect(404);
    await http().get(episodes).auth(tokens.consulta, { type: 'bearer' }).expect(200);
    await http().post(episodes).send({ resumo: 'sem autorização' }).expect(401);
  });

  it('preserva ano informado sem criar comparecimento e resolve pendência por vínculo', async () => {
    const annual = `/pacientes/${patientId}/ocorrencias-anuais`;
    const field = await owner.query(`SELECT campo_id::text,captura_desde IS NOT NULL AS ativa
      FROM ambulatorio.auditoria_campo WHERE tabela_destino='evento_clinico'
        AND coluna_destino='ano_evento' AND coluna_pk='evento_clinico_id'
        AND tipo_sql='integer' AND serializacao_versao='v1'`);
    expect(field.rows).toHaveLength(1);
    expect(field.rows[0].ativa).toBe(true);
    const visitsBefore = (await owner.query('SELECT count(*)::int AS n FROM ambulatorio.atendimento WHERE paciente_id=$1', [patientId])).rows[0].n;
    const created = await http().post(annual).auth(tokens.edicao, { type: 'bearer' }).send({ ano: 2025 }).expect(201);
    const audit = await owner.query(`SELECT e.origem,e.ator_usuario_id::text AS ator,
        e.importacao_linha_id,e.revisao_alvo_id,e.revisao_campo_id,
        e.antes->>'estado' AS estado_anterior,e.depois->>'valor' AS ano_novo
      FROM ambulatorio.auditoria_campo_evento e
      WHERE e.campo_id=$1 AND e.registro_id=$2`, [field.rows[0].campo_id, created.body.eventoId]);
    expect(audit.rows).toEqual([expect.objectContaining({ origem: 'aplicacao', ator: ids.edicao,
      importacao_linha_id: null, revisao_alvo_id: null, revisao_campo_id: null,
      estado_anterior: 'alvo_ausente', ano_novo: '2025' })]);
    const event = await owner.query(`SELECT tipo_evento,ano_evento::int AS ano,ocorreu
      FROM ambulatorio.evento_clinico WHERE evento_clinico_id=$1 AND paciente_id=$2`, [created.body.eventoId,patientId]);
    expect(event.rows).toEqual([{ tipo_evento: 'ultimo_comparecimento_ano_informado', ano: 2025, ocorreu: null }]);
    expect((await owner.query('SELECT count(*)::int AS n FROM ambulatorio.atendimento WHERE paciente_id=$1', [patientId])).rows[0].n)
      .toBe(visitsBefore);
    const events = await http().get(`${annual}?limit=1`).auth(tokens.consulta, { type: 'bearer' }).expect(200);
    expect(events.body[0]).toMatchObject({ eventoId: created.body.eventoId,
      tipo: 'ultimo_comparecimento_ano_informado', ano: 2025, precisao: 'ano' });
    const visits = await owner.query(`SELECT count(*)::int AS n FROM ambulatorio.acompanhamento_cuidado c
      JOIN ambulatorio.atendimento a USING(atendimento_id) WHERE a.paciente_id=$1 AND c.tipo_acompanhamento='ultimo_comparecimento_ano_informado'`, [patientId]);
    expect(visits.rows[0].n).toBe(0);
    const annualReturns = `/pacientes/${patientId}/retornos-anuais`;
    await http().post(annualReturns).auth(tokens.edicao, { type: 'bearer' })
      .send({ atendimentoId: attendanceId, dataRealizada: '2026-02-05', resumo: 'Visita anual sintética' }).expect(201);
    const actual = await http().get(`${annualReturns}?limit=1`).auth(tokens.consulta, { type: 'bearer' }).expect(200);
    expect(actual.body).toEqual([expect.objectContaining({ dataRealizada: '2026-02-05', resumo: 'Visita anual sintética' })]);
    await http().post(annualReturns).auth(tokens.edicao, { type: 'bearer' })
      .send({ atendimentoId: attendanceId, resumo: 'Sem data efetiva' }).expect(400);
    const pendingPath = `/pacientes/${patientId}/pendencias`;
    const pending = await http().post(pendingPath).auth(tokens.edicao, { type: 'bearer' })
      .send({ atendimentoId: attendanceId, descricao: 'Pendência livre sintética', dataIdentificacao: '2026-02-01' }).expect(201);
    const path = `${pendingPath}/${pending.body.pendenciaId}`;
    const initiallyOpen = await http().get(`${pendingPath}?status=aberta`).auth(tokens.consulta, { type: 'bearer' }).expect(200);
    expect(initiallyOpen.body).toEqual(expect.arrayContaining([expect.objectContaining({
      pendenciaId: pending.body.pendenciaId, dataResolucao: null,
    })]));
    await http().patch(path).auth(tokens.consulta, { type: 'bearer' })
      .send({ status: 'resolvida', dataResolucao: '2026-02-02' }).expect(403);
    await http().patch(path).auth(tokens.edicao, { type: 'bearer' })
      .send({ status: 'resolvida' }).expect(400);
    await http().patch(path).auth(tokens.edicao, { type: 'bearer' })
      .send({ status: 'resolvida', dataResolucao: '2026-02-02' }).expect(200);
    const resolved = await http().get(`${pendingPath}?status=resolvida`).auth(tokens.consulta, { type: 'bearer' }).expect(200);
    expect(resolved.body).toEqual(expect.arrayContaining([expect.objectContaining({ pendenciaId: pending.body.pendenciaId,
      descricao: 'Pendência livre sintética', status: 'resolvida', dataResolucao: '2026-02-02' })]));
    const pendingDetail = await http().get(`/pacientes/${patientId}/atendimentos/${attendanceId}`)
      .auth(tokens.consulta, { type: 'bearer' }).expect(200);
    expect(pendingDetail.body.pendencias).toEqual(expect.arrayContaining([expect.objectContaining({
      pendenciaId: pending.body.pendenciaId, status: 'resolvida', dataResolucao: '2026-02-02',
    })]));
    await http().patch(path).auth(tokens.edicao, { type: 'bearer' }).send({ status: 'em_andamento' }).expect(200);
    const reopened = await http().get(`${pendingPath}?status=em_andamento`).auth(tokens.consulta, { type: 'bearer' }).expect(200);
    expect(reopened.body).toEqual(expect.arrayContaining([expect.objectContaining({
      pendenciaId: pending.body.pendenciaId, status: 'em_andamento', dataResolucao: null,
    })]));
    await http().patch(`/pacientes/${otherId}/pendencias/${pending.body.pendenciaId}`)
      .auth(tokens.administracao, { type: 'bearer' }).send({ status: 'em_andamento' }).expect(404);
  });

  it('pagina listas embutidas na ficha e no atendimento e sanitiza erro de vínculo', async () => {
    await http().post(`/pacientes/${patientId}/atendimentos`).auth(tokens.edicao, { type: 'bearer' })
      .send({ dataAtendimento: '2026-02-03', pendencias: [{ descricao: 'Pendência adicional sintética' }] }).expect(201);
    const first = await http().get(`/pacientes/${patientId}?limit=1`).auth(tokens.consulta, { type: 'bearer' }).expect(200);
    const next = await http().get(`/pacientes/${patientId}?limit=1&offset=1`).auth(tokens.consulta, { type: 'bearer' }).expect(200);
    expect(first.body.atendimentos).toHaveLength(1); expect(next.body.atendimentos).toHaveLength(1);
    expect(first.body.paginacaoColecoes).toEqual({ limit: 1, offset: 0 });
    const detail = await http().get(`/pacientes/${patientId}/atendimentos/${attendanceId}?limit=1`)
      .auth(tokens.consulta, { type: 'bearer' }).expect(200);
    expect(detail.body.paginacaoColecoes).toEqual({ limit: 1, offset: 0 });
    expect(detail.body.pendencias).toHaveLength(1);
    await http().get(`/pacientes/${patientId}/atendimentos/${attendanceId}?limit=101`)
      .auth(tokens.consulta, { type: 'bearer' }).expect(400);
    const denied = await http().post(`/pacientes/${otherId}/encaminhamentos`).auth(tokens.edicao, { type: 'bearer' })
      .send({ atendimentoId: attendanceId, motivo: 'Dado que não pode aparecer no erro' }).expect(403);
    expect(JSON.stringify(denied.body)).not.toContain('Dado que não pode aparecer no erro');
  });
});
