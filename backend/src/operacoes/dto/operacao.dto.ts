import { IsIn, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class RegisterOperationDto {
  @IsUUID('4') operacaoId!: string;
  @IsIn(['POST','PATCH','PUT']) metodo!: 'POST' | 'PATCH' | 'PUT';
  @IsString() @MaxLength(220) caminho!: string;
  @Matches(/^[0-9a-f]{64}$/) corpoHash!: string;
}

export class OperationIdDto {
  @IsUUID('4') operacaoId!: string;
}
