import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import { Perfis } from '../auth/perfis.decorator';
import { PageQuery } from '../clinico/dto/clinico.dto';
import { UsuariosService } from './usuarios.service';
import { ClinicalIdPipe } from '../clinico/clinical-validation';

@Controller('usuarios')
@Perfis('administracao')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Get()
  list(@Query() query: PageQuery) { return this.usuarios.list(query); }

  @Get(':usuarioId')
  get(@Param('usuarioId', ClinicalIdPipe) usuarioId: string, @Query() query: Record<string, unknown>) {
    if (Object.keys(query).length) throw new BadRequestException('Parâmetros de consulta não permitidos');
    return this.usuarios.get(usuarioId);
  }
}
