import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { Perfis } from '../auth/perfis.decorator';
import { ClinicalIdPipe } from '../clinico/clinical-validation';
import { PageQuery } from '../clinico/dto/clinico.dto';
import { SorologiaCreateDto } from '../clinico/dto/sorologia.dto';
import { SorologiaCriadaResponse, SorologiaResponse } from '../clinico/dto/sorologia.response';
import { SorologiasService } from './sorologias.service';

@Perfis('consulta', 'edicao', 'administracao')
@Controller('pacientes/:id/atendimentos/:atendimentoId/sorologias')
export class SorologiasController {
  constructor(private readonly sorologias: SorologiasService) {}

  @Get()
  list(@Param('id', ClinicalIdPipe) patientId: string,
    @Param('atendimentoId', ClinicalIdPipe) attendanceId: string, @Query() query: PageQuery,
    @CurrentUser() user: AuthenticatedUser): Promise<SorologiaResponse[]> {
    return this.sorologias.list(user, patientId, attendanceId, query);
  }

  @Post() @Perfis('edicao', 'administracao')
  create(@Param('id', ClinicalIdPipe) patientId: string,
    @Param('atendimentoId', ClinicalIdPipe) attendanceId: string, @Body() dto: SorologiaCreateDto,
    @CurrentUser() user: AuthenticatedUser): Promise<SorologiaCriadaResponse> {
    return this.sorologias.create(user, patientId, attendanceId, dto);
  }
}
