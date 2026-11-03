import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsString, IsUUID, Length, Matches, ValidateBy } from 'class-validator';
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
