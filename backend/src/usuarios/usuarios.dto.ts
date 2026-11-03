import { Transform } from 'class-transformer';
import { IsOptional, IsBoolean, IsIn, IsString, IsUUID, Length, Matches, ValidateBy } from 'class-validator';
import { Perfil, PERFIS } from '../auth/auth.types';

export class ComandoContaDto {
  @IsUUID('4') operacaoId!: string;
  @IsString() @Matches(/^[1-9]\d{0,18}$/)
  @ValidateBy({ name: 'versaoBigint', validator: { validate: value => typeof value === 'string'
    && /^[1-9]\d{0,18}$/.test(value) && BigInt(value) <= 9223372036854775807n } }) versao!: string;
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(10, 1000) justificativa!: string;
}

export class AlterarPerfilDto extends ComandoContaDto {
  @IsIn(PERFIS) perfil!: Perfil;
}

export class AlterarEstadoDto extends ComandoContaDto {
  @IsBoolean() ativo!: boolean;
}

export class CriarUsuarioDto {
 @IsUUID('4') operacaoId!: string;
 @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
 @IsString() @Length(3,160) nome!: string;
 @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
 @IsString() @Length(3,254) @Matches(/^[a-z0-9][a-z0-9._@+-]*$/) login!: string;
 @IsIn(PERFIS) perfil!: Perfil;
 @IsOptional() @IsString() @Length(0,1000) justificativa?: string;
}
