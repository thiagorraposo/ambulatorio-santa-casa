import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
export class DispositivoCreateDto {
  @IsIn(['marcapasso', 'cdi']) tipoDispositivo!: 'marcapasso' | 'cdi';
  @IsOptional() @IsBoolean() possuiDispositivo?: boolean | null;
  @IsOptional() @IsString() @MaxLength(10000) observacoes?: string | null;
}
export interface DispositivoCriadoResponse { dispositivoId: string }
export interface DispositivoResponse extends Required<DispositivoCreateDto>, DispositivoCriadoResponse { pacienteId: string }
