import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { Perfis } from '../auth/perfis.decorator';
import { ClinicalIdPipe } from '../clinico/clinical-validation';
import { ComorbidadesCreateDto, ComorbidadesCriadaResponse } from '../clinico/dto/comorbidades.dto';
import { ComorbidadesService } from './comorbidades.service';

@Perfis('consulta', 'edicao', 'administracao')
@Controller('pacientes/:id/atendimentos/:atendimentoId/comorbidades')
export class ComorbidadesController {
  constructor(private readonly comorbidades: ComorbidadesService) {}

  @Get()
  async read(@Param('id', ClinicalIdPipe) patientId: string,
    @Param('atendimentoId', ClinicalIdPipe) attendanceId: string,
    @CurrentUser() user: AuthenticatedUser, @Res() response: Response): Promise<Response> {
    return response.json(await this.comorbidades.get(user, patientId, attendanceId));
  }

  @Post() @Perfis('edicao', 'administracao')
  create(@Param('id', ClinicalIdPipe) patientId: string,
    @Param('atendimentoId', ClinicalIdPipe) attendanceId: string, @Body() dto: ComorbidadesCreateDto,
    @CurrentUser() user: AuthenticatedUser): Promise<ComorbidadesCriadaResponse> {
    return this.comorbidades.create(user, patientId, attendanceId, dto);
  }
}
