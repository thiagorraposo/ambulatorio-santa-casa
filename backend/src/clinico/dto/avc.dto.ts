import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** AVC longitudinal: ano normalizado da representação de quatro dígitos da fonte. */
export class AvcCreateDto {
  @IsOptional() @IsBoolean() ocorreu?: boolean | null;
  @IsOptional() @IsInt() @Min(0) @Max(9999) anoEvento?: number | null;
  @IsOptional() @IsString() @MaxLength(10000) descricao?: string | null;
  @IsOptional() @IsString() @MaxLength(10000) observacoes?: string | null;
}
export interface AvcCriadoResponse { eventoId: string }
export interface AvcResponse extends Required<AvcCreateDto>, AvcCriadoResponse {
  pacienteId: string;
  tipo: 'avc';
}
