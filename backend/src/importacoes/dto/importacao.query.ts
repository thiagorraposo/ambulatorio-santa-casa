import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { PageQuery } from '../../clinico/dto/clinico.dto';

export class ImportacaoLoteQuery extends PageQuery {
  @IsOptional()
  @Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : value)
  @IsBoolean()
  apenasComErro = false;
}
