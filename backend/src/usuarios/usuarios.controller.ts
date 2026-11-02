import { Controller, Get, Query } from '@nestjs/common';
import { Perfis } from '../auth/perfis.decorator';
import { PageQuery } from '../clinico/dto/clinico.dto';
import { UsuariosService } from './usuarios.service';

@Controller('usuarios')
@Perfis('administracao')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Get()
  list(@Query() query: PageQuery) { return this.usuarios.list(query); }
}
