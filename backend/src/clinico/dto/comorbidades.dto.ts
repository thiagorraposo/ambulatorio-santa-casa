import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsDefined, IsObject, IsOptional,
  IsString, Matches, MaxLength, ValidateIf, ValidateNested } from 'class-validator';

export class ComorbidadeItemDto {
  @IsString() @Matches(/^[1-9]\d{0,18}$/) comorbidadeId!: string;
  @ValidateIf((_object: unknown, value: unknown) => value !== null)
  @IsDefined() @IsBoolean() possuiComorbidade!: boolean | null;
  @IsOptional() @IsString() @MaxLength(10000) observacoes?: string | null;
}
export class HistoricoFamiliarDto {
  @ValidateIf((_object: unknown, value: unknown) => value !== null)
  @IsDefined() @IsBoolean() possuiDoenca!: boolean | null;
  @IsOptional() @IsString() @MaxLength(10000) descricao?: string | null;
}
export class ComorbidadesCreateDto {
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @ValidateNested({ each: true })
  @Type(() => ComorbidadeItemDto) itens?: ComorbidadeItemDto[];
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsObject() @ValidateNested() @Type(() => HistoricoFamiliarDto) historicoFamiliar?: HistoricoFamiliarDto;
}
export interface ComorbidadesCriadaResponse { avaliacaoComorbidadesId: string }
export interface ComorbidadesResponse extends ComorbidadesCriadaResponse {
  atendimentoId: string;
  itens: Array<{ itemId: string; comorbidadeId: string; nomeComorbidade: string;
    possuiComorbidade: boolean | null; observacoes: string | null }>;
  historicoFamiliar: { possuiDoenca: boolean | null; descricao: string | null } | null;
}
