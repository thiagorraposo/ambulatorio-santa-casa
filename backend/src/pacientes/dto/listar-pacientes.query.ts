import { Transform } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class ListarPacientesQuery {
  @Transform(({ value }) => value === undefined ? 20 : Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
