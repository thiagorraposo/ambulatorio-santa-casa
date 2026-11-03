import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { DatabaseService } from '../common/database/database.service';
import { ClinicalAccessService } from '../common/security/clinical-access.service';
import { DashboardIndicador, DashboardQuery, DashboardResponse } from './dashboard.dto';

export function dashboardPeriod(query: DashboardQuery, now = new Date()): { inicio: string; fim: string } {
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

@Injectable()
export class DashboardService {
  constructor(private readonly database: DatabaseService, private readonly access: ClinicalAccessService) {}

  async get(user: AuthenticatedUser, query: DashboardQuery): Promise<DashboardResponse> {
    const periodo = dashboardPeriod(query);
    this.access.requireEnabled();
    return this.database.transaction(async tx => {
      await this.access.identity(tx, user);
      const scope = this.access.scope(user, 3, 'p');
      // One statement: all metrics share a snapshot, authorization precedes aggregation.
      const result = await tx.query<{ pacientes: string; atendimentos: string; pendencias: string;
        lotes: string | null; pode_lotes: boolean; atualizado_em: string }>(`
        WITH pacientes_autorizados AS MATERIALIZED (
          SELECT p.paciente_id FROM paciente p WHERE ${scope.sql}
        ), capacidade AS MATERIALIZED (
          SELECT ambulatorio.dashboard_pode_consultar_importacoes() AS pode_lotes
        )
        SELECT
          (SELECT count(*)::text FROM pacientes_autorizados) AS pacientes,
          (SELECT count(*)::text FROM atendimento a JOIN pacientes_autorizados p USING(paciente_id)
            WHERE a.data_atendimento BETWEEN $1::date AND $2::date) AS atendimentos,
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
          capacidade.pode_lotes, clock_timestamp()::text AS atualizado_em
        FROM capacidade`, [periodo.inicio, periodo.fim, ...scope.values]);
      const row = result.rows[0];
      const indicator = (valor: string, definicao: string, periodoAplicado: boolean): DashboardIndicador => ({
        estado: 'disponivel', valor: Number(valor), definicao, periodoAplicado,
      });
      return {
        periodo: { ...periodo, limites: 'inclusivos', tempoLotes: 'timestamp_sem_fuso' }, atualizadoEm: row.atualizado_em,
        indicadores: {
          pacientes: indicator(row.pacientes, 'Pessoas distintas atualmente autorizadas; todos os períodos.', false),
          atendimentos: indicator(row.atendimentos, 'Atendimentos registrados com data de realização no período; exclui planos e datas ausentes.', true),
          pendencias: indicator(row.pendencias, 'Pendências assistenciais atualmente abertas ou em andamento de pacientes autorizados; todos os períodos.', false),
          lotes: row.pode_lotes && row.lotes !== null
            ? indicator(row.lotes, 'Lotes autorizados concluídos, incluindo concluídos com pendências, pela data e hora de finalização registrada (sem fuso); reenvio idempotente não cria lote.', true)
            : { estado: 'sem_permissao', valor: null, definicao: 'Exige capacidade explícita de consulta de importações e autorização do lote.', periodoAplicado: true },
        },
      };
    }, user.usuarioId);
  }
}
