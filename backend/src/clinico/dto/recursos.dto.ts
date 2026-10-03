import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { PageQuery } from './clinico.dto';

const idPattern = /^[1-9]\d{0,18}$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export class ProjectDto {
  @Matches(idPattern) projetoId!: string;
  @IsOptional() @IsBoolean() participa?: boolean | null;
  @IsOptional() @IsBoolean() possuiPendencia?: boolean | null;
  @IsOptional() @IsString() @MaxLength(10000) descricaoPendencia?: string | null;
  @IsOptional() @IsBoolean() houveFalha?: boolean | null;
  @IsOptional() @IsString() @MaxLength(10000) descricaoFalha?: string | null;
  @IsOptional() @IsString() @MaxLength(10000) observacoes?: string | null;
}

export class NotificationDto {
  @IsOptional() @IsBoolean() pacienteNotificado?: boolean | null;
  @IsOptional() @IsString() @MaxLength(100) numeroNotificacao?: string | null;
  @IsOptional() @IsString() @MaxLength(10000) justificativaNaoNotificacao?: string | null;
  @IsOptional() @IsString() @MaxLength(10000) observacoes?: string | null;
}

export class ReferralDto {
  @Matches(idPattern) atendimentoId!: string;
  @IsOptional() @Matches(idPattern) tipoEncaminhamentoId?: string | null;
  @IsOptional() @Matches(idPattern) projetoId?: string | null;
  @IsOptional() @IsIn(['ambulatorio', 'projeto_pesquisa', 'atencao_basica', 'servico_especializado', 'hospital', 'demanda_espontanea', 'outro', 'nao_informado']) origem?: string | null;
  @IsOptional() @IsString() @MaxLength(180) destinoNome?: string | null;
  @IsOptional() @IsString() @MaxLength(180) destinoServico?: string | null;
  @IsOptional() @IsString() @MaxLength(120) especialidadeDestino?: string | null;
  @IsOptional() @IsDateString({ strict: true }) @Matches(datePattern) dataEncaminhamento?: string | null;
  @IsOptional() @IsDateString({ strict: true }) @Matches(datePattern) dataAgendamento?: string | null;
  @IsOptional() @IsDateString({ strict: true }) @Matches(datePattern) dataRealizacao?: string | null;
  @IsOptional() @IsIn(['indicado', 'solicitado', 'agendado', 'realizado', 'pendente', 'cancelado', 'nao_compareceu', 'nao_informado']) status?: string | null;
  @IsOptional() @IsIn(['baixa', 'media', 'alta', 'urgente', 'nao_informado']) prioridade?: string | null;
  @IsOptional() @IsBoolean() documentoApresentado?: boolean | null;
  @IsOptional() @IsString() @MaxLength(10000) motivo?: string | null;
  @IsOptional() @IsString() @MaxLength(10000) condutaOrientada?: string | null;
  @IsOptional() @IsString() @MaxLength(10000) observacoes?: string | null;
}

export class ReferralQuery extends PageQuery {
  @IsOptional() @IsIn(['indicado', 'solicitado', 'agendado', 'realizado', 'pendente', 'cancelado', 'nao_compareceu', 'nao_informado']) status?: string;
}

export class CounterReferralDto {
  @IsOptional() @IsDateString({ strict: true }) @Matches(datePattern) dataRealizada?: string | null;
  @IsOptional() @IsIn(['programado', 'em_andamento', 'concluido', 'pendente', 'cancelado', 'perdido_seguimento', 'nao_informado']) status?: string | null;
  @IsOptional() @IsString() @MaxLength(10000) resumo?: string | null;
  @IsOptional() @IsString() @MaxLength(10000) conduta?: string | null;
  @IsOptional() @IsString() @MaxLength(10000) observacoes?: string | null;
}

export class PendingCreateDto {
  @Matches(idPattern) atendimentoId!: string;
  @IsString() @MaxLength(10000) descricao!: string;
  @IsOptional() @IsIn(['aberta', 'em_andamento', 'resolvida', 'cancelada', 'nao_informado']) status?: string;
  @IsOptional() @IsDateString({ strict: true }) @Matches(datePattern) dataIdentificacao?: string | null;
}

export class PendingUpdateDto {
  @IsIn(['aberta', 'em_andamento', 'resolvida', 'cancelada', 'nao_informado']) status!: string;
  @IsOptional() @IsDateString({ strict: true }) @Matches(datePattern) dataResolucao?: string | null;
}

export class AnnualAttendanceDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(9999) ano!: number;
}

export class AnnualReturnDto {
  @Matches(idPattern) atendimentoId!: string;
  @IsDateString({ strict: true }) @Matches(datePattern) dataRealizada!: string;
  @IsOptional() @IsString() @MaxLength(10000) resumo?: string | null;
}

export class ClinicalEventsQuery extends PageQuery {
  @IsOptional() @IsIn(['ultimo_comparecimento_ano_informado']) tipo?: string;
}
