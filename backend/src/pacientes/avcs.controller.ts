import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { Perfis } from '../auth/perfis.decorator';
import { ClinicalIdPipe } from '../clinico/clinical-validation';
import { PageQuery } from '../clinico/dto/clinico.dto';
import { AvcCreateDto, AvcCriadoResponse, AvcResponse } from '../clinico/dto/avc.dto';
import { AvcsService } from './avcs.service';

@Perfis('consulta', 'edicao', 'administracao')
@Controller('pacientes/:id/avcs')
export class AvcsController {
  constructor(private readonly avcs: AvcsService) {}

  @Get()
  list(@Param('id', ClinicalIdPipe) patientId: string,
    @Query() query: PageQuery,
    @CurrentUser() user: AuthenticatedUser): Promise<AvcResponse[]> {
    return this.avcs.list(user, patientId, query);
  }

  @Post() @Perfis('edicao', 'administracao')
  create(@Param('id', ClinicalIdPipe) patientId: string,
    @Body() dto: AvcCreateDto,
    @CurrentUser() user: AuthenticatedUser): Promise<AvcCriadoResponse> {
    return this.avcs.create(user, patientId, dto);
  }
}
