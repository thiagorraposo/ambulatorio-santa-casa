import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { Perfis } from '../auth/perfis.decorator';
import { ClinicalIdPipe } from '../clinico/clinical-validation';
import { ObitoCreateDto, ObitoCriadoResponse } from '../clinico/dto/obito.dto';
import { ObitoService } from './obito.service';

@Perfis('consulta', 'edicao', 'administracao')
@Controller('pacientes/:id/obito')
export class ObitoController {
  constructor(private readonly obito: ObitoService) {}

  @Get()
  async read(@Param('id', ClinicalIdPipe) patientId: string,
    @CurrentUser() user: AuthenticatedUser, @Res() response: Response): Promise<Response> {
    // Nest's default adapter sends an empty body for null; this resource returns JSON null.
    return response.json(await this.obito.read(user, patientId));
  }

  @Post() @Perfis('edicao', 'administracao')
  create(@Param('id', ClinicalIdPipe) patientId: string,
    @Body() dto: ObitoCreateDto,
    @CurrentUser() user: AuthenticatedUser): Promise<ObitoCriadoResponse> {
    return this.obito.create(user, patientId, dto);
  }
}
