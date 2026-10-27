import { IsDateString, IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export const sorologiaResults = ['reagente', 'nao_reagente', 'inconclusivo', 'indeterminado', 'nao_informado'] as const;
export type SorologiaResult = typeof sorologiaResults[number];

/** Ocorrência individual; ausência e não informado continuam distintos. */
export class SorologiaCreateDto {
  @IsOptional() @IsString() @MaxLength(120) metodoSorologico?: string | null;
  @IsOptional() @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) dataSolicitacao?: string | null;
  @IsOptional() @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) dataColeta?: string | null;
  @IsOptional() @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) dataResultado?: string | null;
  @IsOptional() @IsIn(sorologiaResults) resultado?: SorologiaResult | null;
  @IsOptional() @IsString() @MaxLength(120) laboratorio?: string | null;
  @IsOptional() @IsString() @MaxLength(10000) observacoes?: string | null;
}
