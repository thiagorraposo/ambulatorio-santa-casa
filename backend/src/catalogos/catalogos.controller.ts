import { Controller, Get, Query } from '@nestjs/common';
import { Perfis } from '../auth/perfis.decorator';
import { PageQuery } from '../clinico/dto/clinico.dto';
import { CatalogosService } from './catalogos.service';
import { CatalogoResponse } from './dto/catalogo.response';

@Perfis('consulta', 'edicao', 'administracao')
@Controller('catalogos')
export class CatalogosController {
  constructor(private readonly catalogos: CatalogosService) {}

  @Get('exames')
  exames(@Query() query: PageQuery): Promise<CatalogoResponse[]> {
    return this.catalogos.list('exames', query);
  }

  @Get('projetos')
  projetos(@Query() query: PageQuery): Promise<CatalogoResponse[]> {
    return this.catalogos.list('projetos', query);
  }

  @Get('tipos-encaminhamento')
  tiposEncaminhamento(@Query() query: PageQuery): Promise<CatalogoResponse[]> {
    return this.catalogos.list('tipos-encaminhamento', query);
  }
}
