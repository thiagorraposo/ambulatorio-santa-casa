import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { Perfis } from '../auth/perfis.decorator';
import { ClinicalIdPipe } from '../clinico/clinical-validation';
import { PageQuery } from '../clinico/dto/clinico.dto';
import { DispositivoCreateDto, DispositivoCriadoResponse, DispositivoResponse } from '../clinico/dto/dispositivo.dto';
import { DispositivosService } from './dispositivos.service';

@Perfis('consulta', 'edicao', 'administracao')
@Controller('pacientes/:id/dispositivos')
export class DispositivosController {
  constructor(private readonly dispositivos: DispositivosService) {}

  @Get()
  list(@Param('id', ClinicalIdPipe) patientId: string,
    @Query() query: PageQuery,
    @CurrentUser() user: AuthenticatedUser): Promise<DispositivoResponse[]> {
    return this.dispositivos.list(user, patientId, query);
  }

  @Post() @Perfis('edicao', 'administracao')
  create(@Param('id', ClinicalIdPipe) patientId: string,
    @Body() dto: DispositivoCreateDto,
    @CurrentUser() user: AuthenticatedUser): Promise<DispositivoCriadoResponse> {
    return this.dispositivos.create(user, patientId, dto);
  }
}
