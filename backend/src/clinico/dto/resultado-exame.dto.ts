import { IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
export class ResultadoExameCreateDto {
  @IsString() @Length(1,120) @Matches(/\S/) nomeParametro!:string;
  @IsOptional() @IsString() @MaxLength(10000) valorInformado?:string|null;
  @IsOptional() @IsString() @MaxLength(10000) unidadeInformada?:string|null;
  @IsOptional() @IsString() @MaxLength(10000) referenciaInformada?:string|null;
  @IsOptional() @IsString() @MaxLength(10000) interpretacaoInformada?:string|null;
  @IsOptional() @IsString() @MaxLength(10000) observacoes?:string|null;
}
export interface ResultadoExameResponse {
  resultadoId:string;exameId:string;nomeParametro:string;valorInformado:string|null;unidadeInformada:string|null;
  referenciaInformada:string|null;interpretacaoInformada:string|null;observacoes:string|null;
}
