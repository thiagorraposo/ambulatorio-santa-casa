import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { Perfis } from '../auth/perfis.decorator';
import { ClinicalIdPipe } from '../clinico/clinical-validation';
import { PageQuery } from '../clinico/dto/clinico.dto';
import { ComplicacaoChagasCreateDto } from '../clinico/dto/complicacao-chagas.dto';
import { ComplicacaoChagasCriadaResponse, ComplicacaoChagasResponse } from '../clinico/dto/complicacao-chagas.response';
import { ComplicacoesChagasService } from './complicacoes-chagas.service';

@Perfis('consulta', 'edicao', 'administracao')
@Controller('pacientes/:id/atendimentos/:atendimentoId/complicacoes-chagas')
export class ComplicacoesChagasController {
  constructor(private readonly complicacoes: ComplicacoesChagasService) {}

  @Get()
  list(@Param('id', ClinicalIdPipe) patientId: string,
    @Param('atendimentoId', ClinicalIdPipe) attendanceId: string, @Query() query: PageQuery,
    @CurrentUser() user: AuthenticatedUser): Promise<ComplicacaoChagasResponse[]> {
    return this.complicacoes.list(user, patientId, attendanceId, query);
  }

  @Post() @Perfis('edicao', 'administracao')
  create(@Param('id', ClinicalIdPipe) patientId: string,
    @Param('atendimentoId', ClinicalIdPipe) attendanceId: string, @Body() dto: ComplicacaoChagasCreateDto,
    @CurrentUser() user: AuthenticatedUser): Promise<ComplicacaoChagasCriadaResponse> {
    return this.complicacoes.create(user, patientId, attendanceId, dto);
  }
}
