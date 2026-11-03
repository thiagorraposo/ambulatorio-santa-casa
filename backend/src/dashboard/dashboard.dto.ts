import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';

export class DashboardQuery {
  @IsOptional() @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/)
  inicio?: string;
  @IsOptional() @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fim?: string;
  @IsOptional() @IsString() @Length(1, 120) nome?: string;
  @IsOptional() @Matches(/^[1-9]\d{0,18}$/) pacienteId?: string;
  @IsOptional() @IsIn(['feminino', 'masculino', 'outro', 'nao_informado']) sexo?: string;
  @IsOptional() @Matches(/^[1-9]\d{0,18}$/) projetoId?: string;
  @IsOptional() @IsIn(['aberta', 'em_andamento', 'resolvida']) statusPendencia?: string;
  @IsOptional() @IsIn(['data_desc', 'data_asc', 'nome_asc']) ordenacao?: 'data_desc' | 'data_asc' | 'nome_asc';
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number = 20;
  @Type(() => Number) @IsInt() @Min(0) @Max(100000) offset?: number = 0;
}

export interface DashboardIndicador {
  estado: 'disponivel' | 'sem_permissao';
  valor: number | null;
  definicao: string;
  periodoAplicado: boolean;
}

export interface DashboardResultado {
  pacienteId: string;
  nome: string;
  atendimentoId: string;
  dataAtendimento: string;
  pendenciasAbertas: number;
}

export interface DashboardResponse {
  resultados: DashboardResultado[];
  paginacao: { limit: number; offset: number; total: number };
  serieAtendimentos: { mes: string; total: number }[];
  projetos: { projetoId: string; nome: string }[];
  periodo: { inicio: string; fim: string; limites: 'inclusivos'; tempoLotes: 'timestamp_sem_fuso' };
  atualizadoEm: string;
  indicadores: {
    pacientes: DashboardIndicador;
    atendimentos: DashboardIndicador;
    pendencias: DashboardIndicador;
    lotes: DashboardIndicador;
  };
}
