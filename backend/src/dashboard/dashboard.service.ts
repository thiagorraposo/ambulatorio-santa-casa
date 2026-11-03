import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { DatabaseService, Transaction } from '../common/database/database.service';
import { ClinicalAccessService } from '../common/security/clinical-access.service';
import { DashboardIndicador, DashboardQuery, DashboardResponse, DashboardResultado } from './dashboard.dto';

export function dashboardPeriod(query: Pick<DashboardQuery, 'inicio' | 'fim'>, now = new Date()): { inicio: string; fim: string } {
  const today = now.toISOString().slice(0, 10);
  const inicio = query.inicio ?? `${today.slice(0, 7)}-01`;
  const fim = query.fim ?? today;
  const valid = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
    && value >= '0001-01-01' && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  if (!valid(inicio) || !valid(fim) || inicio > fim) {
    throw new BadRequestException('Período inválido: informe datas válidas em ordem crescente');
  }
  if (Date.parse(fim) - Date.parse(inicio) > 366 * 86400000) {
    throw new BadRequestException('Selecione um período de até 367 dias');
  }
  return { inicio, fim };
}

export const DASHBOARD_EXPORT_LIMIT = 5000;

/** Filters constrain the authorized patient cohort; dates constrain realized visits only. */
function cohort(user: AuthenticatedUser, query: DashboardQuery, access: ClinicalAccessService) {
  const periodo = dashboardPeriod(query);
  for (const id of [query.pacienteId, query.projetoId]) {
    if (id !== undefined && (!/^[1-9]\d{0,18}$/.test(id) || BigInt(id) > 9223372036854775807n)) {
      throw new BadRequestException('Identificador inválido');
    }
  }
  const values: unknown[] = [periodo.inicio, periodo.fim];
  const scope = access.scope(user, 3, 'p');
  values.push(...scope.values);
  const predicates = [scope.sql];
  const bind = (value: unknown) => { values.push(value); return `$${values.length}`; };
  if (query.nome) predicates.push(`p.nome ILIKE ${bind(`%${query.nome}%`)}`);
  if (query.pacienteId) predicates.push(`p.paciente_id=${bind(query.pacienteId)}::bigint`);
  if (query.sexo) predicates.push(`p.sexo=${bind(query.sexo)}`);
  if (query.projetoId) predicates.push(`EXISTS (SELECT 1 FROM paciente_projeto_estudo pp
    WHERE pp.paciente_id=p.paciente_id AND pp.projeto_estudo_id=${bind(query.projetoId)}::bigint AND pp.participa IS TRUE)`);
  if (query.statusPendencia) predicates.push(`EXISTS (SELECT 1 FROM pendencia_atendimento dp
    JOIN atendimento ap USING(atendimento_id) WHERE ap.paciente_id=p.paciente_id
    AND dp.status_pendencia=${bind(query.statusPendencia)})`);
  const ctes = `pacientes_escopo AS MATERIALIZED (
      SELECT p.paciente_id,p.nome FROM paciente p WHERE ${scope.sql}
    ), pacientes_autorizados AS MATERIALIZED (
      SELECT p.paciente_id,p.nome FROM paciente p WHERE ${predicates.join(' AND ')}
    ), atendimentos_filtrados AS MATERIALIZED (
      SELECT a.atendimento_id,a.paciente_id,p.nome,a.data_atendimento,
        (SELECT count(*)::int FROM pendencia_atendimento d WHERE d.atendimento_id=a.atendimento_id
          AND d.status_pendencia IN ('aberta','em_andamento')) AS pendencias_abertas
      FROM atendimento a JOIN pacientes_autorizados p USING(paciente_id)
      WHERE a.data_atendimento BETWEEN $1::date AND $2::date
    )`;
  return { periodo, values, ctes };
}
function ordering(query: DashboardQuery): string {
  return query.ordenacao === 'data_asc' ? 'data_atendimento ASC,atendimento_id ASC'
    : query.ordenacao === 'nome_asc' ? 'nome ASC,paciente_id ASC,data_atendimento DESC,atendimento_id DESC'
    : 'data_atendimento DESC,atendimento_id DESC';
}
function resultsSql(order: string): string {
  return `SELECT paciente_id::text AS "pacienteId",nome,atendimento_id::text AS "atendimentoId",
    data_atendimento::text AS "dataAtendimento",pendencias_abertas AS "pendenciasAbertas"
    FROM atendimentos_filtrados ORDER BY ${order}`;
}

@Injectable()
export class DashboardService {
  constructor(private readonly database: DatabaseService, private readonly access: ClinicalAccessService) {}

  async get(user: AuthenticatedUser, query: DashboardQuery): Promise<DashboardResponse> {
    const { periodo, values, ctes } = cohort(user, query, this.access);
    this.access.requireEnabled();
    return this.database.transaction(async tx => {
      await this.access.identity(tx, user);
      const limit = query.limit ?? 20; const offset = query.offset ?? 0;
      const limitPos = values.length + 1; const offsetPos = values.length + 2;
      // A single statement keeps metrics, graph, rows and total on the same snapshot.
      const result = await tx.query<{ pacientes: string; atendimentos: string; pendencias: string;
        lotes: string | null; pode_lotes: boolean; atualizado_em: string;
        resultados: DashboardResultado[]; serie: DashboardResponse['serieAtendimentos']; projetos: DashboardResponse['projetos'] }>(`
        WITH ${ctes}, capacidade AS MATERIALIZED (
          SELECT ambulatorio.dashboard_pode_consultar_importacoes() AS pode_lotes
        )
        SELECT
          (SELECT count(*)::text FROM pacientes_autorizados) AS pacientes,
          (SELECT count(*)::text FROM atendimentos_filtrados) AS atendimentos,
          (SELECT count(*)::text FROM pendencia_atendimento d JOIN atendimento a USING(atendimento_id)
            JOIN pacientes_autorizados p USING(paciente_id)
            WHERE d.status_pendencia IN ('aberta','em_andamento')) AS pendencias,
          CASE WHEN capacidade.pode_lotes THEN (
            SELECT count(*)::text FROM importacao_lote_consulta l
            WHERE ambulatorio.importacao_lote_pode_consultar(l.importacao_lote_id)
              AND l.status_lote IN ('concluido','concluido_com_pendencias')
              AND l.finalizado_em >= $1::date::timestamp
              AND l.finalizado_em < ($2::date + 1)::timestamp
          ) END AS lotes,
          (SELECT coalesce(json_agg(r),'[]'::json) FROM (${resultsSql(ordering(query))}
            LIMIT $${limitPos} OFFSET $${offsetPos}) r) AS resultados,
          (SELECT coalesce(json_agg(s ORDER BY s.mes),'[]'::json) FROM (
            SELECT to_char(data_atendimento,'YYYY-MM') AS mes,count(*)::int AS total
            FROM atendimentos_filtrados GROUP BY 1) s) AS serie,
          (SELECT coalesce(json_agg(pr ORDER BY pr.nome,pr."projetoId"),'[]'::json) FROM (
            SELECT DISTINCT pe.projeto_estudo_id::text AS "projetoId",pe.nome_projeto AS nome
            FROM projeto_estudo pe JOIN paciente_projeto_estudo pp USING(projeto_estudo_id)
            JOIN pacientes_escopo p USING(paciente_id) WHERE pp.participa IS TRUE) pr) AS projetos,
          capacidade.pode_lotes, clock_timestamp()::text AS atualizado_em
        FROM capacidade`, [...values, limit, offset]);
      const row = result.rows[0];
      const indicator = (valor: string, definicao: string, periodoAplicado: boolean): DashboardIndicador => ({
        estado: 'disponivel', valor: Number(valor), definicao, periodoAplicado,
      });
      return {
        resultados: row.resultados ?? [], serieAtendimentos: row.serie ?? [], projetos: row.projetos ?? [],
        paginacao: { limit, offset, total: Number(row.atendimentos) },
        periodo: { ...periodo, limites: 'inclusivos', tempoLotes: 'timestamp_sem_fuso' }, atualizadoEm: row.atualizado_em,
        indicadores: {
          pacientes: indicator(row.pacientes, 'Pessoas distintas atualmente autorizadas nos filtros de pacientes; todos os períodos.', false),
          atendimentos: indicator(row.atendimentos, 'Atendimentos registrados com data de realização no período dos pacientes filtrados; exclui planos e datas ausentes.', true),
          pendencias: indicator(row.pendencias, 'Pendências assistenciais atualmente abertas ou em andamento dos pacientes filtrados; todos os períodos.', false),
          lotes: row.pode_lotes && row.lotes !== null
            ? indicator(row.lotes, 'Lotes autorizados concluídos, incluindo concluídos com pendências, pela data de finalização (sem fuso). Somente o período se aplica; filtros de pacientes não alteram lotes.', true)
            : { estado: 'sem_permissao', valor: null, definicao: 'Exige capacidade explícita de consulta de importações e autorização do lote. Somente o período se aplica.', periodoAplicado: true },
        },
      };
    }, user.usuarioId);
  }

  async exportCsv(user: AuthenticatedUser, query: DashboardQuery): Promise<DashboardResultado[]> {
    const { periodo, values, ctes } = cohort(user, query, this.access);
    this.access.requireEnabled();
    return this.database.transaction(async tx => {
      await this.access.identity(tx, user);
      // The extra row detects overflow; never silently truncate to a page or the volume ceiling.
      const result = await tx.query<DashboardResultado>(`WITH ${ctes}
        ${resultsSql(ordering(query))} LIMIT ${DASHBOARD_EXPORT_LIMIT + 1}`, values);
      if (result.rows.length > DASHBOARD_EXPORT_LIMIT) {
        throw new BadRequestException(`Exportação excede ${DASHBOARD_EXPORT_LIMIT} atendimentos; refine os filtros`);
      }
      await this.auditExport(tx, query, periodo, result.rows.length);
      return result.rows;
    }, user.usuarioId);
  }

  private async auditExport(tx: Transaction, query: DashboardQuery, periodo: { inicio: string; fim: string }, total: number) {
    // Allowlist: no patient names, record contents, credentials or pagination in the audit ledger.
    const filtros = { ...periodo, pacienteId: query.pacienteId, nomeFiltrado: Boolean(query.nome),
      sexo: query.sexo, projetoId: query.projetoId, statusPendencia: query.statusPendencia };
    await tx.query('SELECT ambulatorio.dashboard_registrar_exportacao($1::jsonb,$2,$3)',
      [JSON.stringify(filtros), query.ordenacao ?? 'data_desc', total]);
  }
}
