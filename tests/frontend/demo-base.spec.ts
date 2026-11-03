import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { apiAs, fixture, signIn } from './fixtures';
import { assertAccessible, assertFitsViewport } from './stage7-helpers';
import type { DashboardResponse } from '../../frontend/src/features/dashboard/dashboard-model';

// Este arquivo só lê a base de demonstração; nunca usa os helpers que criam pacientes.
test.skip(process.env.FRONTEND_SEED_MODE !== 'demo', 'Execute frontend-e2e --demo-test');
const demo = (fixture as unknown as { demo: { inicio: string; fim: string; anchor: string; projects: { id: string }[] } }).demo;
const requireBackend = createRequire(resolve(__dirname, '../../backend/package.json'));
const { Pool } = requireBackend('pg');
const owner = () => new Pool({ host: process.env.PGHOST, port: Number(process.env.PGPORT), user: process.env.PGUSER,
  password: process.env.PGPASSWORD, database: process.env.FRONTEND_E2E_DB });
const seed = resolve(__dirname, 'seed.mjs');

test('demo: reexecução idempotente, limites, recursos clínicos e rejeição de destinos/estados inseguros', async () => {
  test.setTimeout(90_000);
  const db = owner();
  try {
    const snapshot = async () => (await db.query(`SELECT
      (SELECT count(*) FROM ambulatorio.paciente)::int AS pacientes,
      (SELECT count(*) FROM ambulatorio.atendimento)::int AS atendimentos,
      (SELECT count(*) FROM ambulatorio.auditoria_campo_evento)::int AS auditoria,
      (SELECT count(*) FROM ambulatorio.importacao_lote)::int AS lotes,
      (SELECT count(*) FROM ambulatorio.usuario_aplicacao)::int AS usuarios`)).rows[0];
    const before = await snapshot();
    expect(before).toMatchObject({ pacientes: 10, atendimentos: 27, lotes: 3, usuarios: 3 });
    expect(before.auditoria).toBeGreaterThan(0);
    const original = readFileSync(process.env.FRONTEND_E2E_FIXTURE!, 'utf8');
    const rerun = spawnSync(process.execPath, [seed], { env: process.env, encoding: 'utf8' });
    expect(rerun.status, rerun.stderr).toBe(0);
    expect(rerun.stdout).toContain('nenhuma escrita');
    expect(readFileSync(process.env.FRONTEND_E2E_FIXTURE!, 'utf8')).toBe(original);
    for (const override of [{ FRONTEND_E2E_DB: 'ambulatorio_santa_casa' }, { APP_DB_NAME: 'persistente' },
      { CLINICAL_ACCESS_POLICY: 'todos_sinteticos' }, { FRONTEND_E2E_FIXTURE: `${process.env.FRONTEND_E2E_DIR}/ausente.json` }]) {
      const refused = spawnSync(process.execPath, [seed], { env: { ...process.env, ...override }, encoding: 'utf8' });
      expect(refused.status).not.toBe(0);
      expect(refused.stderr).toMatch(/exclusivo|exige banco|Demo exige/);
    }
    expect(await snapshot()).toEqual(before);
    // Releitura de todos os cenários pelo contrato real, sem acrescentar pacientes.
    const get = async (path: string) => { const response = await apiAs('administracao', 'GET', path);
      expect(response.status, path).toBe(200); return response.json(); };
    for (const [index, p] of fixture.patients.entries()) {
      const path = `/pacientes/${p.pacienteId}`;
      const visits = await get(`${path}/atendimentos`);
      expect(visits).toHaveLength(index === 9 ? 0 : 3);
      if (index === 9) continue;
      const first = visits[visits.length - 1];
      const ap = `${path}/atendimentos/${first.atendimentoId}`;
      const detail = await get(ap);
      expect(detail.diagnosticoChagas.statusDiagnostico).toBe(index === 4 ? 'inconclusivo' : index === 5 ? 'descartado' : 'confirmado');
      expect(await get(`${ap}/sorologias`)).toHaveLength(2);
      expect((await get(`${ap}/comorbidades`)).itens).toHaveLength(2);
      expect(await get(`${ap}/condicao-chagas`)).toEqual(index === 4 || index === 5 ? null : expect.objectContaining({ faseDoenca: 'cronica' }));
      expect(await get(`${path}/exames/${detail.exames[0].exameId}/resultados`)).toHaveLength(1);
      expect(await get(`${path}/retornos-anuais`)).toHaveLength(1);
      if ([0, 6].includes(index)) {
        const bzn = await get(`${path}/tratamento-bzn`);
        expect(bzn.iniciado).toBe(true);
        expect(bzn.teveReacaoAdversa).toBe(index === 6);
        expect(await get(`${path}/retornos-bzn`)).toHaveLength(1);
      }
      if ([1, 2, 3].includes(index)) {
        const refs = await get(`${path}/encaminhamentos`); expect(refs).toHaveLength(1);
        expect(await get(`${path}/encaminhamentos/${refs[0].encaminhamentoId}/contrarreferencias`)).toHaveLength(1);
      }
      if (index === 1) expect(await get(`${path}/atendimentos/${visits[0].atendimentoId}/medicamentos`)).toHaveLength(1);
      if (index === 8) expect(await get(`${path}/obito`)).toMatchObject({ houveObito: true, causaObito: null });
    }
    // Integridade temporal dos registros e ausência de atendimentos após óbito.
    expect((await db.query(`SELECT a.atendimento_id FROM ambulatorio.atendimento a
      JOIN ambulatorio.paciente p USING(paciente_id) LEFT JOIN ambulatorio.obito o USING(paciente_id)
      WHERE a.data_atendimento < p.data_nascimento OR a.data_atendimento > CURRENT_DATE
        OR (o.houve_obito AND a.data_atendimento > o.data_obito)`)).rows).toEqual([]);
    expect((await db.query(`SELECT c.conname FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace
      WHERE n.nspname='ambulatorio' AND NOT c.convalidated`)).rows).toEqual([]);
    expect((await db.query(`SELECT count(*)::int AS n FROM ambulatorio.auditoria_contexto_transacao
      WHERE origem='aplicacao' AND ator_usuario_id=$1`, [fixture.users.administracao.usuarioId])).rows[0].n).toBeGreaterThan(27);
  } finally { await db.end(); }
});

for (const perfil of ['consulta', 'edicao', 'administracao'] as const) {
  test(`demo ${perfil}: SQL = API = dashboard, filtros, gráfico, páginas, CSV e percursos`, async ({ page }, info) => {
    test.setTimeout(180_000);
    const db = owner();
    try {
      const patients = (await db.query(`SELECT p.paciente_id::text AS id,p.nome,p.sexo,
        ARRAY(SELECT pp.projeto_estudo_id::text FROM ambulatorio.paciente_projeto_estudo pp WHERE pp.paciente_id=p.paciente_id AND pp.participa) AS projetos,
        ARRAY(SELECT DISTINCT d.status_pendencia FROM ambulatorio.pendencia_atendimento d JOIN ambulatorio.atendimento a USING(atendimento_id) WHERE a.paciente_id=p.paciente_id) AS status
        FROM ambulatorio.paciente p WHERE $1::boolean OR EXISTS (SELECT 1 FROM ambulatorio.acesso_paciente ac
          WHERE ac.paciente_id=p.paciente_id AND ac.usuario_id=$2 AND ac.ativo)`,
      [perfil === 'administracao', fixture.users[perfil].usuarioId])).rows;
      expect(patients).toHaveLength(perfil === 'administracao' ? 10 : perfil === 'edicao' ? 9 : 8);
      const visits = (await db.query(`SELECT a.paciente_id::text AS "pacienteId",p.nome,a.atendimento_id::text AS "atendimentoId",
        a.data_atendimento::text AS "dataAtendimento",(SELECT count(*)::int FROM ambulatorio.pendencia_atendimento d
          WHERE d.atendimento_id=a.atendimento_id AND d.status_pendencia IN ('aberta','em_andamento')) AS "pendenciasAbertas"
        FROM ambulatorio.atendimento a JOIN ambulatorio.paciente p USING(paciente_id)
        WHERE a.paciente_id=ANY($1::bigint[])`, [patients.map((p: { id: string }) => p.id)])).rows;
      const lots = (await db.query(`SELECT l.finalizado_em::date::text AS dia FROM ambulatorio.importacao_lote l
        WHERE l.status_lote IN ('concluido','concluido_com_pendencias') AND EXISTS (
          SELECT 1 FROM ambulatorio.importacao_linha il JOIN ambulatorio.importacao_registro ir USING(importacao_linha_id)
          WHERE il.importacao_lote_id=l.importacao_lote_id AND ir.tabela_destino='paciente' AND ir.registro_id=ANY($1::bigint[]))`,
      [patients.map((p: { id: string }) => p.id)])).rows;
      const verify = async (query: Record<string, string> = {}) => {
        const params = { inicio: demo.inicio, fim: demo.fim, ...query };
        const response = await apiAs(perfil, 'GET', `/dashboard?${new URLSearchParams(params)}`);
        expect(response.status).toBe(200);
        const data = await response.json() as DashboardResponse;
        const cohort = patients.filter((p: { id: string; nome: string; sexo: string; projetos: string[]; status: string[] }) =>
          (!query.nome || p.nome.toLocaleLowerCase().includes(query.nome.toLocaleLowerCase()))
          && (!query.pacienteId || p.id === query.pacienteId) && (!query.sexo || p.sexo === query.sexo)
          && (!query.projetoId || p.projetos.includes(query.projetoId)) && (!query.statusPendencia || p.status.includes(query.statusPendencia)));
        const ids = new Set(cohort.map((p: { id: string }) => p.id));
        const all = visits.filter((a: { pacienteId: string }) => ids.has(a.pacienteId));
        const expected = all.filter((a: { dataAtendimento: string }) => a.dataAtendimento >= params.inicio && a.dataAtendimento <= params.fim);
        expected.sort((a: { nome: string; dataAtendimento: string; atendimentoId: string }, b: typeof a) =>
          query.ordenacao === 'data_asc' ? a.dataAtendimento.localeCompare(b.dataAtendimento) || Number(BigInt(a.atendimentoId) - BigInt(b.atendimentoId))
            : query.ordenacao === 'nome_asc' ? a.nome.localeCompare(b.nome, 'pt-BR') || b.dataAtendimento.localeCompare(a.dataAtendimento)
              : b.dataAtendimento.localeCompare(a.dataAtendimento) || Number(BigInt(b.atendimentoId) - BigInt(a.atendimentoId)));
        expect(data.indicadores.pacientes.valor).toBe(cohort.length);
        expect(data.indicadores.atendimentos.valor).toBe(expected.length);
        expect(data.indicadores.pendencias.valor).toBe(all.reduce((n: number, a: { pendenciasAbertas: number }) => n + a.pendenciasAbertas, 0));
        expect(data.indicadores.lotes).toMatchObject(perfil === 'consulta' ? { estado: 'sem_permissao', valor: null }
          : { estado: 'disponivel', valor: lots.filter((l: { dia: string }) => l.dia >= params.inicio && l.dia <= params.fim).length });
        const serie = new Map<string, number>();
        for (const a of expected) { const mes = a.dataAtendimento.slice(0, 7); serie.set(mes, (serie.get(mes) ?? 0) + 1); }
        expect(data.serieAtendimentos).toEqual([...serie].sort().map(([mes, total]) => ({ mes, total })));
        expect(data.paginacao.total).toBe(expected.length);
        expect(data.resultados).toEqual(expected.slice(Number(query.offset ?? 0), Number(query.offset ?? 0) + Number(query.limit ?? 20)));
        return { data, expected };
      };
      const full = await verify();
      expect(full.expected).toHaveLength(perfil === 'administracao' ? 27 : 24);
      const current = await verify({ inicio: `${demo.anchor.slice(0, 7)}-01` });
      expect(current.data.indicadores.atendimentos.valor).toBe(8);
      for (const sexo of ['feminino', 'masculino', 'outro', 'nao_informado']) await verify({ sexo });
      for (const statusPendencia of ['aberta', 'em_andamento', 'resolvida']) await verify({ statusPendencia });
      for (const project of demo.projects) await verify({ projetoId: project.id });
      for (const ordenacao of ['data_asc', 'nome_asc']) await verify({ ordenacao });
      await verify({ limit: '5', offset: '5' });
      await verify({ inicio: '2000-01-01', fim: '2000-01-01' });
      const combined = { nome: 'Aurora', pacienteId: fixture.main.pacienteId, sexo: 'feminino', projetoId: demo.projects[0]!.id,
        statusPendencia: 'aberta', ordenacao: 'data_asc' };
      await verify(combined);
      expect((await apiAs(perfil, 'GET', `/pacientes/${fixture.reserved.pacienteId}`)).status).toBe(perfil === 'administracao' ? 200 : 403);
      expect((await apiAs(perfil, 'POST', `/pacientes/${fixture.main.pacienteId}/atendimentos`, {})).status).toBe(perfil === 'consulta' ? 403 : 400);

      await signIn(page, perfil);
      await expect(page.getByRole('heading', { name: 'Início', exact: true })).toBeVisible();
      const menu = page.getByRole('navigation', { name: 'Menu principal', exact: true });
      await expect(menu.getByRole('link', { name: 'Usuários', exact: true })).toHaveCount(perfil === 'administracao' ? 1 : 0);
      await page.screenshot({ path: info.outputPath(`inicio-${perfil}.png`), fullPage: true });
      await menu.getByRole('link', { name: 'Pacientes', exact: true }).click();
      await page.getByRole('link', { name: `Ver ficha de ${fixture.main.nome}`, exact: true }).click();
      await page.getByRole('navigation', { name: 'Seções da ficha', exact: true }).getByRole('link', { name: 'Atendimentos', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Histórico de atendimentos', exact: true })).toBeVisible();
      await expect(page.getByRole('table', { name: 'Atendimentos desta página', exact: true }).locator('tbody tr')).toHaveCount(3);
      await expect(page.getByRole('link', { name: 'Novo atendimento', exact: true })).toHaveCount(perfil === 'consulta' ? 0 : 1);
      await page.screenshot({ path: info.outputPath(`historico-${perfil}.png`), fullPage: true });
      await menu.getByRole('link', { name: 'Dashboard', exact: true }).click();
      await expect(page.getByLabel('Atendimentos realizados: 8', { exact: true })).toBeVisible();
      await page.getByLabel('Data inicial', { exact: true }).fill(demo.inicio);
      await page.getByLabel('Data final', { exact: true }).fill(demo.fim);
      await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
      for (const [key, title] of [['pacientes', 'Pacientes autorizados'], ['atendimentos', 'Atendimentos realizados'], ['pendencias', 'Pendências abertas'], ['lotes', 'Lotes de importação concluídos']] as const) {
        const card = page.getByRole('group', { name: title, exact: true });
        const indicator = full.data.indicadores[key];
        if (indicator.estado === 'sem_permissao') await expect(card).toContainText('Sem permissão');
        else await expect(card.getByLabel(`${title}: ${indicator.valor}`, { exact: true })).toBeVisible();
      }
      await expect(page.getByRole('img', { name: /Gráfico de atendimentos por mês/ })).toBeVisible();
      await page.getByText('Ver tabela de atendimentos por mês', { exact: true }).click();
      const series = page.getByRole('table', { name: 'Atendimentos por mês', exact: true });
      await expect(series.locator('tbody tr')).toHaveCount(full.data.serieAtendimentos.length);
      for (const row of full.data.serieAtendimentos) await expect(series.getByRole('row', { name: `${row.mes.split('-').reverse().join('/')} ${row.total}`, exact: true })).toBeVisible();
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 960 }); await assertFitsViewport(page); await assertAccessible(page);
        await page.screenshot({ path: info.outputPath(`dashboard-${perfil}-${width}.png`), fullPage: true });
      }
      await page.setViewportSize({ width: 1440, height: 960 });
      await page.getByRole('img', { name: /Gráfico de atendimentos por mês/ }).focus();
      await expect(page.getByRole('img', { name: /Gráfico de atendimentos por mês/ })).toBeFocused();
      const pagination = page.getByRole('navigation', { name: 'Paginação de resultados do dashboard', exact: true });
      await pagination.getByRole('button', { name: 'Próxima', exact: true }).click();
      await expect(page.getByRole('table', { name: 'Atendimentos encontrados', exact: true }).locator('tbody tr')).toHaveCount(full.expected.length - 20);
      await pagination.getByRole('button', { name: 'Anterior', exact: true }).click();
      await expect(page.getByRole('table', { name: 'Atendimentos encontrados', exact: true }).locator('tbody tr')).toHaveCount(20);
      await page.getByRole('button', { name: 'Exportar CSV', exact: true }).click();
      const downloaded = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Confirmar exportação CSV', exact: true }).click();
      const csv = (await readFile((await (await downloaded).path())!, 'utf8')).replace(/^\uFEFF/, '');
      expect(csv.trim().split(/\r?\n/)).toHaveLength(full.expected.length + 1);
      for (const p of patients) if (visits.some((a: { pacienteId: string }) => a.pacienteId === p.id)) expect(csv).toContain(p.nome);
      if (perfil !== 'administracao') expect(csv).not.toContain(fixture.reserved.nome);
      const audit = (await db.query(`SELECT quantidade FROM ambulatorio.dashboard_exportacao_evento WHERE ator_usuario_id=$1 ORDER BY exportacao_id DESC LIMIT 1`, [fixture.users[perfil].usuarioId])).rows[0];
      expect(audit.quantidade).toBe(full.expected.length);
      await page.getByLabel('Nome do paciente', { exact: true }).fill(combined.nome);
      await page.getByLabel('ID do paciente', { exact: true }).fill(combined.pacienteId);
      await page.getByLabel('Sexo', { exact: true }).selectOption(combined.sexo);
      await page.getByLabel('Projeto', { exact: true }).selectOption(combined.projetoId);
      await page.getByLabel('Status da pendência', { exact: true }).selectOption(combined.statusPendencia);
      await page.getByLabel('Ordenação', { exact: true }).selectOption(combined.ordenacao);
      await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
      await expect(page.getByLabel('Atendimentos realizados: 3', { exact: true })).toBeVisible();
      await expect(page.getByRole('table', { name: 'Atendimentos encontrados', exact: true }).locator('tbody tr')).toHaveCount(3);
      await page.screenshot({ path: info.outputPath(`filtros-${perfil}.png`), fullPage: true });
      await menu.getByRole('link', { name: 'Pacientes', exact: true }).click();
      await page.getByRole('button', { name: 'Exportar CSV desta página', exact: true }).click();
      const patientDownload = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Confirmar exportação CSV', exact: true }).click();
      const patientCsv = await readFile((await (await patientDownload).path())!, 'utf8');
      expect(patientCsv.trim().split(/\r?\n/)).toHaveLength(patients.length + 1);
      info.annotations.push({ type: 'SQL/API/UI', description: JSON.stringify({ pacientes: patients.length,
        atendimentos: full.expected.length, atuais: 8, pendencias: full.data.indicadores.pendencias.valor, lotes: full.data.indicadores.lotes.valor }) });
    } finally { await db.end(); }
  });
}
