import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class ListarPacientesQuery {
  @Transform(({ value }) => value === undefined ? 20 : Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
  @Transform(({ value }) => value === undefined ? 0 : Number(value))
  @IsInt() @Min(0) @Max(100000)
  offset = 0;
  @IsOptional() @IsString() @Length(1, 120) nome?: string;
  @IsOptional() @IsIn(['feminino', 'masculino', 'outro', 'nao_informado']) sexo?: string;
}
