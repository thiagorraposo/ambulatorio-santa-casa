import { Transform } from 'class-transformer';
import { IsIn, IsString, IsUUID, Length, Matches, ValidateBy } from 'class-validator';
import { Perfil, PERFIS } from '../auth/auth.types';

export class AlterarPerfilDto {
  @IsUUID('4') operacaoId!: string;
  @IsString() @Matches(/^[1-9]\d{0,18}$/)
  @ValidateBy({ name: 'versaoBigint', validator: { validate: value => typeof value === 'string'
    && /^[1-9]\d{0,18}$/.test(value) && BigInt(value) <= 9223372036854775807n } }) versao!: string;
  @IsIn(PERFIS) perfil!: Perfil;
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(10, 1000) justificativa!: string;
}
