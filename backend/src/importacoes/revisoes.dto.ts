import { Type } from 'class-transformer';
import { Allow, ArrayMaxSize, IsArray, IsDateString, IsDefined, IsInt, IsObject, IsOptional, IsString, Matches,
  Max, MaxLength, Min, MinLength, ValidateIf, ValidateNested } from 'class-validator';

const id = () => Matches(/^[1-9]\d{0,18}$/);

export class EnvelopeRevisaoDto {
  @Matches(/^(valor|nulo|alvo_ausente|desconhecido|coluna_ausente|celula_vazia|nulo_explicito|linha_ausente)$/) estado!: string;
  @IsString() @MinLength(1) @MaxLength(100) tipo_sql!: string;
  @Matches(/^(ano|data_completa|instante|nao_temporal)$/) precisao!: string;
  @Matches(/^v1$/) serializacao_versao!: string;
  @Allow() @ValidateIf((_object, value) => value !== null) @IsDefined() valor!: unknown;
}

export class CampoRevisaoDto {
  @id() campoId!: string;
  @IsOptional() @id() registroId!: string | null;
  @IsString() @MinLength(1) @MaxLength(100) alvoChave!: string;
  @IsString() @MinLength(1) @MaxLength(100) chaveSemantica!: string;
  @IsString() @MinLength(1) @MaxLength(100) blocoFuncional!: string;
  @IsInt() @Min(1) @Max(10000) ocorrencia!: number;
  @Matches(/^(sem_mudanca|correcao_ocorrencia|nova_visita|atualizacao_consolidada|revisao_necessaria)$/) categoria!: string;
  @Matches(/^(conservar|associar|definir|anular|criar)$/) operacao!: string;
  @IsDefined() @IsObject() @ValidateNested() @Type(() => EnvelopeRevisaoDto) base!: EnvelopeRevisaoDto;
  @IsDefined() @IsObject() @ValidateNested() @Type(() => EnvelopeRevisaoDto) proposto!: EnvelopeRevisaoDto;
}

export class CelulaRevisaoDto {
  @Matches(/^[A-Z]+$/) posicao!: string;
  @IsString() @MaxLength(500) cabecalho!: string;
  @IsString() @MinLength(1) @MaxLength(100) chave!: string;
  @IsOptional() @IsInt() @Min(1) ocorrencia!: number | null;
  @IsString() @MinLength(1) @MaxLength(100) bloco!: string;
  @Allow() @ValidateIf((_object, value) => value !== null) @IsDefined() valor!: unknown;
}

export class LinhaPropostaRevisaoDto {
  @IsOptional() @id() linhaBaseId!: string | null;
  @IsOptional() @id() pacienteId!: string | null;
  @IsOptional() @id() atendimentoBaseId!: string | null;
  @IsString() @MinLength(1) @MaxLength(150) abaNomeOriginal!: string;
  @IsInt() @Min(1) @Max(1000) abaOrdem!: number;
  @IsInt() @Min(2) @Max(1048576) numeroLinha!: number;
  @Matches(/^(autorizar|bloquear)$/) resultado!: 'autorizar' | 'bloquear';
  @IsArray() @ArrayMaxSize(256) @ValidateNested({ each: true }) @Type(() => CampoRevisaoDto) campos!: CampoRevisaoDto[];
  @IsArray() @ArrayMaxSize(512) @ValidateNested({ each: true }) @Type(() => CelulaRevisaoDto) dadosBrutos!: CelulaRevisaoDto[];
  @IsOptional() @Matches(/^[0-9a-f]{64}$/) snapshotSha256?: string;
}

export class PropostaRevisaoDto {
  @IsArray() @ArrayMaxSize(10000) @ValidateNested({ each: true }) @Type(() => LinhaPropostaRevisaoDto) linhas!: LinhaPropostaRevisaoDto[];
}

export class RegistrarFonteRevisaoDto {
  @IsString() @Matches(/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/) codigoFonte!: string;
  @id() loteInicialId!: string;
}

export class ConcederAutorizacaoRevisaoDto {
  @id() fonteId!: string;
  @id() usuarioId!: string;
  @IsOptional() @IsDateString() validaAte?: string;
}

export class RevogarAutorizacaoRevisaoDto {
  @id() autorizacaoId!: string;
}

export class SimularPropostaDto {
  @id() fonteId!: string;
  @id() loteBaseId!: string;
  @id() autorizacaoId!: string;
  @IsString() @MinLength(1) @MaxLength(10 * 1024 * 1024) manifestoRevisado!: string;
  @IsString() @MinLength(1) @MaxLength(10 * 1024 * 1024) transformacoes!: string;
  @IsDefined() @IsObject() @ValidateNested() @Type(() => PropostaRevisaoDto) proposta!: PropostaRevisaoDto;
}

export class SimularArquivoDto {
  @id() fonteId!: string;
  @id() loteBaseId!: string;
  @id() autorizacaoId!: string;
  @IsString() @MinLength(1) @MaxLength(10 * 1024 * 1024) manifestoRevisado!: string;
  @IsString() @MinLength(1) @MaxLength(10 * 1024 * 1024) transformacoes!: string;
  @IsString() @MinLength(1) @MaxLength(10 * 1024 * 1024) proposta!: string;
}

export class PrepararRevisaoDto {
  @id() fonteId!: string;
  @id() loteBaseId!: string;
  @id() loteRevisadoId!: string;
  @Matches(/^[a-f0-9]{64}$/) hashTransformacoes!: string;
  @id() autorizacaoId!: string;
}

export class SimularDecisaoDto {
  @id() decisaoId!: string;
  @id() autorizacaoId!: string;
}

export class FinalizarRevisaoDto {
  @id() revisaoId!: string;
  @id() autorizacaoId!: string;
  @Matches(/^(encerrar|cancelar)$/) acao!: 'encerrar' | 'cancelar';
}

export class PublicarDecisaoDto {
  @id() revisaoId!: string;
  @id() linhaRevisadaId!: string;
  @IsOptional() @id() linhaBaseId!: string | null;
  @IsOptional() @id() pacienteId!: string | null;
  @IsOptional() @id() atendimentoBaseId!: string | null;
  @id() autorizacaoId!: string;
  @Matches(/^(autorizar|bloquear)$/) resultado!: 'autorizar' | 'bloquear';
  @IsString() @MinLength(1) @MaxLength(2000) justificativa!: string;
  @IsArray() @ArrayMaxSize(256) @ValidateNested({ each: true }) @Type(() => CampoRevisaoDto) campos!: CampoRevisaoDto[];
  @IsOptional() @id() decisaoAnteriorId!: string | null;
}
