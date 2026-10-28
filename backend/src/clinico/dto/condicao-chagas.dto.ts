import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const formasClinicas = ['indeterminada', 'cardiaca', 'digestiva', 'cardiodigestiva', 'aguda', 'cronica', 'nao_informado'] as const;
export const fasesDoenca = ['aguda', 'cronica', 'nao_informado'] as const;
export type FormaClinica = typeof formasClinicas[number];
export type FaseDoenca = typeof fasesDoenca[number];

/** Campos independentes do modelo físico existente, sem classificação inferida. */
export class CondicaoChagasCreateDto {
  @IsOptional() @IsIn(formasClinicas) formaClinica?: FormaClinica | null;
  @IsOptional() @IsIn(fasesDoenca) faseDoenca?: FaseDoenca | null;
  @IsOptional() @IsString() @MaxLength(80) classificacaoClinica?: string | null;
  @IsOptional() @IsBoolean() possuiSintomas?: boolean | null;
  @IsOptional() @IsString() @MaxLength(10000) descricaoSintomas?: string | null;
  @IsOptional() @IsString() @MaxLength(10000) observacoes?: string | null;
}
