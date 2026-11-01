import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const gravidadesComplicacao = ['leve', 'moderada', 'grave', 'nao_informado'] as const;
export type GravidadeComplicacao = typeof gravidadesComplicacao[number];

/** Quatro campos independentes da SQL06, sem classificação ou presença inferidas. */
export class ComplicacaoChagasCreateDto {
  @IsOptional() @IsString() @MaxLength(80) tipoComplicacao?: string | null;
  @IsOptional() @IsBoolean() possuiComplicacao?: boolean | null;
  @IsOptional() @IsString() @MaxLength(10000) descricao?: string | null;
  @IsOptional() @IsIn(gravidadesComplicacao) gravidade?: GravidadeComplicacao | null;
}
