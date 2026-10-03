import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNumber,
  IsOptional, IsString, Length, Matches, Max, MaxLength, Min, ValidateIf, ValidateNested } from 'class-validator';

export class PageQuery {
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @Type(() => Number) @IsInt() @Min(0) @Max(100000) offset = 0;
}
export class PatientQuery extends PageQuery {
  @IsOptional() @IsString() @Length(1, 120) nome?: string;
  @IsOptional() @IsIn(['feminino', 'masculino', 'outro', 'nao_informado']) sexo?: string;
}
export class PendingQuery extends PageQuery {
  @IsOptional() @IsIn(['aberta', 'em_andamento', 'resolvida', 'cancelada', 'nao_informado']) status?: string;
}
export class AddressDto {
  @IsOptional() @IsString() @MaxLength(2000) endereco?: string | null;
  @IsOptional() @IsString() @MaxLength(120) cidade?: string | null;
}
export class PatientCreateDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(1, 255) nome!: string;
  @IsOptional() @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) dataNascimento?: string | null;
  @IsOptional() @IsIn(['feminino', 'masculino', 'outro', 'nao_informado']) sexo?: string | null;
  @IsOptional() @IsString() @MaxLength(50) raca?: string | null;
  @IsOptional() @IsBoolean() pertenceComunidadeTradicional?: boolean | null;
  @IsOptional() @IsIn(['indigena', 'quilombola']) tipoComunidadeTradicional?: string | null;
  @IsOptional() @ValidateNested() @Type(() => AddressDto) endereco?: AddressDto;
  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) @Length(1, 30, { each: true }) telefones?: string[];
}
export class PatientUpdateDto {
  @Matches(/^[1-9]\d{0,18}$/) versao!: string;
  @ValidateIf((_o: unknown, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(1, 255) nome?: string;
  @IsOptional() @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) dataNascimento?: string | null;
  @IsOptional() @IsIn(['feminino', 'masculino', 'outro', 'nao_informado']) sexo?: string | null;
  @IsOptional() @IsString() @MaxLength(50) raca?: string | null;
  @IsOptional() @IsBoolean() pertenceComunidadeTradicional?: boolean | null;
  @IsOptional() @IsIn(['indigena', 'quilombola']) tipoComunidadeTradicional?: string | null;
  @IsOptional() @ValidateNested() @Type(() => AddressDto) endereco?: AddressDto;
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(10) @IsString({ each: true }) @Length(1, 30, { each: true }) telefonesAdicionar?: string[];
}
export class ClinicalDataDto {
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) alturaCm?: number | null;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) pesoKg?: number | null;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) circunferenciaAbdominalCm?: number | null;
  @IsOptional() @IsInt() frequenciaCardiacaBpm?: number | null;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) saturacaoPercentual?: number | null;
  @IsOptional() @IsInt() paSistolicaMmhg?: number | null;
  @IsOptional() @IsInt() paDiastolicaMmhg?: number | null;
  @IsOptional() @IsString() @MaxLength(20) nyha?: string | null;
  @IsOptional() @IsString() @MaxLength(10000) observacoes?: string | null;
}
export class DiagnosisDto {
  @IsOptional() @IsBoolean() possuiDiagnosticoChagas?: boolean | null;
  @IsOptional() @IsIn(['confirmado', 'descartado', 'inconclusivo', 'suspeito', 'nao_informado']) statusDiagnostico?: string | null;
  @IsOptional() @IsIn(['positivo', 'negativo', 'inconclusivo', 'indeterminado', 'nao_informado']) resultadoFinal?: string | null;
  @IsOptional() @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) dataResultadoFinal?: string | null;
  @IsOptional() @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) dataDescobertaAutorelato?: string | null;
  @IsOptional() @IsString() @MaxLength(80) criterioConfirmacao?: string | null;
  @IsOptional() @IsString() @MaxLength(10000) observacoes?: string | null;
}
export class ExamDto {
  @Matches(/^[1-9]\d{0,18}$/) tipoExameId!: string;
  @IsIn(['trazido', 'solicitado']) bloco!: 'trazido' | 'solicitado';
  @IsOptional() @IsString() @Length(1, 1000) identificacao?: string;
  @IsOptional() @IsString() @MaxLength(10000) resultado?: string | null;
  @IsOptional() @IsString() @MaxLength(10000) observacoes?: string | null;
  @IsOptional() @Matches(/^[1-9]\d{0,18}$/) atendimentoId?: string;
}
export class PendingDto {
  @IsString() @Length(1, 10000) descricao!: string;
  @IsOptional() @IsIn(['aberta', 'em_andamento', 'resolvida', 'cancelada', 'nao_informado']) status?: string;
}
export class FamilyResultDto {
  @IsString() @Length(1, 1000) familiar!: string;
  @IsString() @Length(1, 10000) resultado!: string;
}
export class FamilyScreeningDto {
  @ValidateIf((_o: unknown, v: unknown) => v !== null) @IsBoolean() familiaresExaminados!: boolean | null;
  @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => FamilyResultDto) familiares!: FamilyResultDto[];
}
export class AttendanceCreateDto {
  @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) dataAtendimento!: string;
  @IsOptional() @IsString() @MaxLength(120) localizacaoProntuario?: string | null;
  @IsOptional() @IsBoolean() ambulatorioUnicamente?: boolean | null;
  @IsOptional() @IsBoolean() ambulatorioAnexoProjeto?: boolean | null;
  @IsOptional() @IsString() @MaxLength(10000) observacoes?: string | null;
  @IsOptional() @ValidateNested() @Type(() => ClinicalDataDto) dadosClinicos?: ClinicalDataDto;
  @IsOptional() @ValidateNested() @Type(() => DiagnosisDto) diagnosticoChagas?: DiagnosisDto;
  @IsOptional() @IsArray() @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => ExamDto) exames?: ExamDto[];
  @IsOptional() @IsArray() @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => PendingDto) pendencias?: PendingDto[];
  @IsOptional() @ValidateNested() @Type(() => FamilyScreeningDto) rastreioFamiliar?: FamilyScreeningDto;
}
export class AttendanceUpdateDto {
  @Matches(/^[1-9]\d{0,18}$/) versao!: string;
  @ValidateIf((_o: unknown, value: unknown) => value !== undefined)
  @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) dataAtendimento?: string;
  @IsOptional() @IsString() @MaxLength(120) localizacaoProntuario?: string | null;
  @IsOptional() @IsBoolean() ambulatorioUnicamente?: boolean | null;
  @IsOptional() @IsBoolean() ambulatorioAnexoProjeto?: boolean | null;
  @IsOptional() @IsString() @MaxLength(10000) observacoes?: string | null;
}
export class AccessDto {
  @IsBoolean() podeEditar!: boolean;
  @IsBoolean() ativo!: boolean;
}
export class BznReturnDto {
  @Matches(/^[1-9]\d{0,18}$/) atendimentoId!: string;
  @IsIn(['retorno_bzn_30_dias', 'retorno_bzn_final']) tipo!: string;
  @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) dataRealizada!: string;
  @IsOptional() @IsString() @MaxLength(10000) resumo?: string;
}
export class BznReactionDto {
  @IsString() @Length(1, 10000) descricao!: string;
  @IsOptional() @IsString() @MaxLength(1000) gravidade?: string | null;
  @IsOptional() @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) dataReacao?: string | null;
  @IsOptional() @IsString() @MaxLength(10000) consequencia?: string | null;
  @IsOptional() @IsString() @MaxLength(10000) observacoes?: string | null;
}
export class BznTreatmentCreateDto {
  @IsOptional() @Matches(/^[1-9]\d{0,18}$/) atendimentoId?: string;
  @IsOptional() @IsBoolean() temIndicacao?: boolean | null;
  @IsOptional() @IsBoolean() iniciado?: boolean | null;
  @IsOptional() @IsBoolean() tratamentoPeloAmbulatorio?: boolean | null;
  @IsOptional() @IsInt() @Min(1) @Max(2147483647) duracaoCumpridaDias?: number | null;
  @IsOptional() @IsInt() @Min(1) @Max(9999) anoUsoAproximado?: number | null;
  @IsOptional() @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) dataPrescricao?: string | null;
  @IsOptional() @IsString() @MaxLength(10000) motivoNaoIndicacao?: string | null;
  @IsOptional() @IsString() @MaxLength(10000) motivoNaoInicio?: string | null;
  @IsOptional() @IsBoolean() teveReacaoAdversa?: boolean | null;
  @IsOptional() @IsString() @MaxLength(10000) observacoes?: string | null;
  @IsOptional() @IsArray() @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => BznReactionDto) reacoes?: BznReactionDto[];
}
export class AnnualFactDto {
  @IsInt() @Min(1) @Max(9999) ano!: number;
}
