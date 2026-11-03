import { IsString, Length, Matches } from 'class-validator';
export class TrocarSenhaDto {
 @IsString() @Length(8, 72) senhaAtual!: string;
 @IsString() @Length(12, 72)
 @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/) novaSenha!: string;
}
