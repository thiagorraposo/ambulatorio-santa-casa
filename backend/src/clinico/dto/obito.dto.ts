import { IsBoolean, IsDateString, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
export class ObitoCreateDto {
  @IsOptional() @IsBoolean() houveObito?: boolean | null;
  @IsOptional() @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) dataObito?: string | null;
  @IsOptional() @IsString() @MaxLength(10000) causaObito?: string | null;
  @IsOptional() @IsString() @MaxLength(10000) observacoes?: string | null;
}
export interface ObitoCriadoResponse { obitoId: string }
export interface ObitoResponse extends Required<ObitoCreateDto>, ObitoCriadoResponse { pacienteId: string }
