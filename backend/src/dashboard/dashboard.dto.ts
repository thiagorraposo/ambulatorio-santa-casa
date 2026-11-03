import { IsDateString, IsOptional, Matches } from 'class-validator';

export class DashboardQuery {
  @IsOptional() @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/)
  inicio?: string;
  @IsOptional() @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fim?: string;
}

export interface DashboardIndicador {
  estado: 'disponivel' | 'sem_permissao';
  valor: number | null;
  definicao: string;
  periodoAplicado: boolean;
}

export interface DashboardResponse {
  periodo: { inicio: string; fim: string; limites: 'inclusivos'; tempoLotes: 'timestamp_sem_fuso' };
  atualizadoEm: string;
  indicadores: {
    pacientes: DashboardIndicador;
    atendimentos: DashboardIndicador;
    pendencias: DashboardIndicador;
    lotes: DashboardIndicador;
  };
}
