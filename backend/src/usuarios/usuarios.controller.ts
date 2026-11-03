import { BadRequestException, Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { AlterarEstadoDto, AlterarPerfilDto, CriarUsuarioDto, ComandoContaDto } from './usuarios.dto';
import { Perfis } from '../auth/perfis.decorator';
import { PageQuery } from '../clinico/dto/clinico.dto';
import { UsuariosService } from './usuarios.service';
import { ClinicalIdPipe } from '../clinico/clinical-validation';

@Controller('usuarios')
@Perfis('administracao')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Post()
  create(@Body() dto: CriarUsuarioDto, @CurrentUser() user: AuthenticatedUser, @Query() query: Record<string, unknown>) {
    if (Object.keys(query).length) throw new BadRequestException('Parâmetros de consulta não permitidos');
    return this.usuarios.create(user, dto);
  }

  @Get('criacoes/:operacaoId')
  creationOperation(@Param('operacaoId', new ParseUUIDPipe({ version: '4' })) operacaoId: string) {
    return this.usuarios.creationOperation(operacaoId);
  }

  @Post(':usuarioId/credencial')
  recover(@Param('usuarioId', ClinicalIdPipe) usuarioId: string, @Body() dto: ComandoContaDto,
    @CurrentUser() user: AuthenticatedUser, @Query() query: Record<string, unknown>) {
    if (Object.keys(query).length) throw new BadRequestException('Parâmetros de consulta não permitidos');
    return this.usuarios.recover(user, usuarioId, dto);
  }

  @Get('credenciais/:operacaoId')
  credentialOperation(@Param('operacaoId', new ParseUUIDPipe({version: '4'})) operacaoId: string) {
    return this.usuarios.credentialOperation(operacaoId);
  }

  @Get()
  list(@Query() query: PageQuery) { return this.usuarios.list(query); }

  @Post(':usuarioId/estado')
  changeState(@Param('usuarioId', ClinicalIdPipe) usuarioId: string,
    @Body() dto: AlterarEstadoDto, @CurrentUser() user: AuthenticatedUser, @Query() query: Record<string, unknown>) {
    if (Object.keys(query).length) throw new BadRequestException('Parâmetros de consulta não permitidos');
    return this.usuarios.changeState(user, usuarioId, dto);
  }

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
