import { IsString, Length, Matches } from 'class-validator';

export class LoginDto {
  @IsString()
  @Length(3, 254)
  @Matches(/^\S+$/)
  login!: string;

  @IsString()
  @Length(8, 128)
  senha!: string;
}

