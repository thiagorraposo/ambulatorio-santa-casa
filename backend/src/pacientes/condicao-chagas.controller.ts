import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { Perfis } from '../auth/perfis.decorator';
import { ClinicalIdPipe } from '../clinico/clinical-validation';
import { CondicaoChagasCreateDto } from '../clinico/dto/condicao-chagas.dto';
import { CondicaoChagasCriadaResponse } from '../clinico/dto/condicao-chagas.response';
import { CondicaoChagasService } from './condicao-chagas.service';

@Perfis('consulta', 'edicao', 'administracao')
@Controller('pacientes/:id/atendimentos/:atendimentoId/condicao-chagas')
export class CondicaoChagasController {
  constructor(private readonly condicao: CondicaoChagasService) {}

  @Get()
  async read(@Param('id', ClinicalIdPipe) patientId: string,
    @Param('atendimentoId', ClinicalIdPipe) attendanceId: string,
    @CurrentUser() user: AuthenticatedUser, @Res() response: Response): Promise<Response> {
    // Nest's default adapter sends an empty body for null; this resource returns JSON null.
    return response.json(await this.condicao.read(user, patientId, attendanceId));
  }

  @Post() @Perfis('edicao', 'administracao')
  create(@Param('id', ClinicalIdPipe) patientId: string,
    @Param('atendimentoId', ClinicalIdPipe) attendanceId: string, @Body() dto: CondicaoChagasCreateDto,
    @CurrentUser() user: AuthenticatedUser): Promise<CondicaoChagasCriadaResponse> {
    return this.condicao.create(user, patientId, attendanceId, dto);
  }
}
