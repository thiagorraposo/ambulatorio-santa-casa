import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';

const suite = process.env.TEST_CLINICAL_DB ? describe : describe.skip;
suite('8B1 dashboard com PostgreSQL e população conhecida', () => {
  let app: INestApplication;
  let owner: Pool;
  const ids: Record<string, string> = {};
  const tokens: Record<string, string> = {};
  const patients: Record<string, string> = {};
  const attendances: Record<string, string[]> = {};
  let baseline: { pacientes: number; atendimentos: number; pendencias: number; lotes: number };
  const http = () => request(app.getHttpServer());
  const get = (profile: string, query = 'inicio=2026-10-30&fim=2026-10-31') => http()
    .get(`/v1/dashboard?${query}`).auth(tokens[profile], { type: 'bearer' });

  beforeAll(async () => {
    if (!/^etapa5_clinical_\d+_\d+$/.test(process.env.TEST_CLINICAL_DB!)) throw new Error('Banco descartável obrigatório');
    owner = new Pool({ host: process.env.TEST_OWNER_HOST, port: Number(process.env.TEST_OWNER_PORT),
      user: process.env.TEST_OWNER_USER, password: process.env.TEST_OWNER_PASSWORD, database: process.env.TEST_CLINICAL_DB });
    baseline = (await owner.query(`SELECT
      (SELECT count(*)::int FROM ambulatorio.paciente) AS pacientes,
      (SELECT count(*)::int FROM ambulatorio.atendimento WHERE data_atendimento BETWEEN '2026-10-30' AND '2026-10-31') AS atendimentos,
      (SELECT count(*)::int FROM ambulatorio.pendencia_atendimento WHERE status_pendencia IN ('aberta','em_andamento')) AS pendencias,
      (SELECT count(*)::int FROM ambulatorio.importacao_lote l WHERE status_lote IN ('concluido','concluido_com_pendencias')
        AND finalizado_em >= '2026-10-30' AND finalizado_em < '2026-11-01'
        AND NOT EXISTS(SELECT 1 FROM ambulatorio.importacao_revisao r WHERE r.lote_revisado_id=l.importacao_lote_id)) AS lotes`)).rows[0];
    for (const profile of ['consulta', 'edicao', 'administracao', 'vazio']) {
      ids[profile] = (await owner.query(`INSERT INTO ambulatorio.usuario_aplicacao(nome,login,senha_hash,perfil)
        VALUES($1,$2,$3,$4) RETURNING usuario_id::text`, [`Dashboard ${profile} sintético`, `dashboard-${profile}@example.invalid`,
        '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK', profile === 'vazio' ? 'consulta' : profile])).rows[0].usuario_id;
    }
    for (const label of ['A', 'B', 'C', 'D']) {
      patients[label] = (await owner.query('INSERT INTO ambulatorio.paciente(nome) VALUES($1) RETURNING paciente_id::text',
        [`Dashboard paciente ${label} sintético`])).rows[0].paciente_id;
      if (label !== 'C') for (const profile of ['consulta', 'edicao']) await owner.query(`
        INSERT INTO ambulatorio.acesso_paciente(paciente_id,usuario_id,pode_editar,concedido_por_usuario_id)
        VALUES($1,$2,$3,$4)`, [patients[label], ids[profile], profile === 'edicao', ids.administracao]);
      attendances[label] = [];
      const dates = label === 'A' ? ['2026-10-28', '2026-10-30', '2026-10-31', '2026-11-01']
        : label === 'B' ? ['2026-10-31'] : label === 'C' ? ['2026-10-30'] : [];
      for (const date of dates) attendances[label].push((await owner.query(`
        INSERT INTO ambulatorio.atendimento(paciente_id,data_atendimento) VALUES($1,$2) RETURNING atendimento_id::text`,
      [patients[label], date])).rows[0].atendimento_id);
    }
    // Unknown clinical date does not fabricate a consultation in the period.
    const unknown = (await owner.query(`INSERT INTO ambulatorio.atendimento(paciente_id) VALUES($1)
      RETURNING atendimento_id::text`, [patients.D])).rows[0].atendimento_id;
    for (const [id, status] of [[attendances.A[0], 'aberta'], [attendances.B[0], 'em_andamento'],
      [attendances.A[0], 'resolvida'], [attendances.B[0], 'nao_informado'], [unknown, null], [attendances.C[0], 'aberta']]) {
      await owner.query(`INSERT INTO ambulatorio.pendencia_atendimento(atendimento_id,descricao,status_pendencia)
        VALUES($1,'Pendência dashboard sintética',$2)`, [id, status]);
    }
    const lots: [string, string | null, string][] = [
      ['concluido', '2026-10-30 00:00:00', 'A'], ['concluido_com_pendencias', '2026-10-31 23:59:59.999999', 'B'],
      ['concluido', '2026-11-01 00:00:00', 'A'], ['falhou', '2026-10-31 12:00:00', 'A'],
      ['processando', null, 'A'], ['concluido', null, 'A'], ['concluido', '2026-10-31 12:00:00', 'C'],
    ];
    for (const [index, [status, finished, label]] of lots.entries()) {
      const lot = (await owner.query(`INSERT INTO ambulatorio.importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote,finalizado_em)
        VALUES($1,$2,'dashboard_sintetico',$3,$4) RETURNING importacao_lote_id::text`,
      [`dashboard-sintetico-${index}`, (index + 1).toString(16).padStart(64, '0'), status, finished])).rows[0].importacao_lote_id;
      const line = (await owner.query(`INSERT INTO ambulatorio.importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha)
        VALUES($1,'Sintética',1,2,'[]','importada') RETURNING importacao_linha_id::text`, [lot])).rows[0].importacao_linha_id;
      await owner.query(`INSERT INTO ambulatorio.importacao_registro(importacao_linha_id,tabela_destino,registro_id,acao)
        VALUES($1,'paciente',$2,'associado')`, [line, patients[label]]);
    }
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication(); configureApp(app); await app.init();
    for (const profile of Object.keys(ids)) tokens[profile] = await app.get(JwtService).signAsync({ sub: ids[profile], typ: 'access' });
  });
  afterAll(async () => { await app?.close(); await owner?.end(); });

  it('nega anônimo e recusa filtros inválidos sem expor identidade', async () => {
    await http().get('/v1/dashboard').expect(401);
    for (const query of ['inicio=2026-02-29', 'inicio=2026-11-02&fim=2026-10-30', 'inicio=2024-01-01&fim=2026-01-01',
      'inicio=2026-10-30T00:00:00Z', 'inicio=2026-10-30&inicio=2026-10-31', 'perfil=administracao']) {
      await get('consulta', query).expect(400);
    }
  });
  it('Consulta/Edição contam 3 pacientes, 3 consultas e 2 pendências; perfil não concede importação', async () => {
    for (const profile of ['consulta', 'edicao']) {
      const { body } = await get(profile).expect(200);
      expect(body.periodo).toEqual({ inicio: '2026-10-30', fim: '2026-10-31', limites: 'inclusivos', tempoLotes: 'timestamp_sem_fuso' });
      expect(body.indicadores.pacientes).toMatchObject({ estado: 'disponivel', valor: 3, periodoAplicado: false });
      expect(body.indicadores.atendimentos).toMatchObject({ estado: 'disponivel', valor: 3, periodoAplicado: true });
      expect(body.indicadores.pendencias).toMatchObject({ estado: 'disponivel', valor: 2, periodoAplicado: false });
      expect(body.indicadores.lotes).toMatchObject({ estado: 'sem_permissao', valor: null });
      expect(JSON.stringify(body)).not.toMatch(/pacienteId|atendimentoId|senha_hash|Dashboard paciente/);
    }
    expect((await get('administracao').expect(200)).body.indicadores.lotes).toMatchObject({ estado: 'sem_permissao', valor: null });
  });
  it('período afeta consultas e mantém estoque e pendências atuais', async () => {
    const { body } = await get('consulta', 'inicio=2026-11-01&fim=2026-11-01').expect(200);
    expect(body.indicadores.atendimentos.valor).toBe(1);
    expect(body.indicadores.pacientes.valor).toBe(3);
    expect(body.indicadores.pendencias.valor).toBe(2);
    expect((await get('consulta', 'inicio=2026-09-01&fim=2026-09-02').expect(200)).body.indicadores.atendimentos.valor).toBe(0);
  });
  it('capacidade explícita conta lotes autorizados antes de agregar e respeita limites', async () => {
    await owner.query('INSERT INTO ambulatorio.dashboard_importacao_leitor(usuario_id) VALUES($1),($2)', [ids.consulta, ids.administracao]);
    const reader = (await get('consulta').expect(200)).body.indicadores.lotes;
    expect(reader).toMatchObject({ estado: 'disponivel', valor: 2 });
    expect((await get('consulta', 'inicio=2026-11-01&fim=2026-11-01').expect(200)).body.indicadores.lotes.valor).toBe(1);
    const { body } = await get('administracao').expect(200);
    expect(body.indicadores.pacientes.valor).toBe(baseline.pacientes + 4);
    expect(body.indicadores.atendimentos.valor).toBe(baseline.atendimentos + 4);
    expect(body.indicadores.pendencias.valor).toBe(baseline.pendencias + 3);
    expect(body.indicadores.lotes.valor).toBe(baseline.lotes + 3);
  });
  it('estoque autorizado vazio é zero; falta de capacidade continua null', async () => {
    const { body } = await get('vazio').expect(200);
    expect(body.indicadores.pacientes.valor).toBe(0);
    expect(body.indicadores.atendimentos.valor).toBe(0);
    expect(body.indicadores.pendencias.valor).toBe(0);
    expect(body.indicadores.lotes.valor).toBeNull();
    await owner.query('INSERT INTO ambulatorio.dashboard_importacao_leitor(usuario_id) VALUES($1)', [ids.vazio]);
    expect((await get('vazio').expect(200)).body.indicadores.lotes).toMatchObject({ estado: 'disponivel', valor: 0 });
  });
  it('revoga capacidade e escopo na requisição seguinte sem reautenticar', async () => {
    await owner.query(`UPDATE ambulatorio.dashboard_importacao_leitor SET revogado_em=clock_timestamp(),revogado_por_principal=session_user
      WHERE usuario_id=$1 AND revogado_em IS NULL`, [ids.consulta]);
    expect((await get('consulta').expect(200)).body.indicadores.lotes).toMatchObject({ estado: 'sem_permissao', valor: null });
    await owner.query('UPDATE ambulatorio.acesso_paciente SET ativo=false WHERE usuario_id=$1 AND paciente_id=$2', [ids.edicao, patients.A]);
    const { body } = await get('edicao').expect(200);
    expect(body.indicadores.pacientes.valor).toBe(2);
    expect(body.indicadores.atendimentos.valor).toBe(1);
    expect(body.indicadores.pendencias.valor).toBe(1);
    await owner.query('UPDATE ambulatorio.usuario_aplicacao SET ativo=false WHERE usuario_id=$1', [ids.edicao]);
    await get('edicao').expect(401);
  });
  it('SQL50 comprova ausência de autoatribuição, imutabilidade e revogação sob rollback', async () => {
    const { readFileSync } = await import('node:fs');
    const script = readFileSync('../tests/sql/50_validar_capacidade_dashboard.sql', 'utf8').replace(/^\\set.*$/gm, '');
    await owner.query(script);
  });
});
