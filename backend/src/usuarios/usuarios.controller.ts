import { BadRequestException, Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { AlterarPerfilDto } from './usuarios.dto';
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

  @Post(':usuarioId/perfil')
  changeProfile(@Param('usuarioId', ClinicalIdPipe) usuarioId: string,
    @Body() dto: AlterarPerfilDto, @CurrentUser() user: AuthenticatedUser, @Query() query: Record<string, unknown>) {
    if (Object.keys(query).length) throw new BadRequestException('Parâmetros de consulta não permitidos');
    return this.usuarios.changeProfile(user, usuarioId, dto);
  }

  @Get(':usuarioId/operacoes/:operacaoId')
  operation(@Param('usuarioId', ClinicalIdPipe) usuarioId: string,
    @Param('operacaoId', new ParseUUIDPipe({ version: '4' })) operacaoId: string, @Query() query: Record<string, unknown>) {
    if (Object.keys(query).length) throw new BadRequestException('Parâmetros de consulta não permitidos');
    return this.usuarios.operation(usuarioId, operacaoId);
  }

  @Get(':usuarioId')
  get(@Param('usuarioId', ClinicalIdPipe) usuarioId: string, @Query() query: Record<string, unknown>) {
    if (Object.keys(query).length) throw new BadRequestException('Parâmetros de consulta não permitidos');
    return this.usuarios.get(usuarioId);
  }
}
