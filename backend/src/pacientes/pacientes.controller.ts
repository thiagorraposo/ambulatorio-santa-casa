import { Body, Controller, Get, Header, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ListarPacientesQuery } from './dto/listar-pacientes.query';
import { PacienteResponse } from './dto/paciente.response';
import { PendenciaResponse } from '../clinico/dto/pendencia.response';
import { PacientesService } from './pacientes.service';
import { Perfis } from '../auth/perfis.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { ClinicalIdPipe } from '../clinico/clinical-validation';
import { AccessDto, AttendanceCreateDto, AttendanceUpdateDto, BznReturnDto, BznTreatmentCreateDto, PageQuery, PendingQuery, PatientCreateDto, PatientUpdateDto } from '../clinico/dto/clinico.dto';
import { AtendimentoDetalheResponse, AtendimentoResumoResponse, ExameResponse, PacienteDetalheResponse,
  RetornoBznCriadoResponse, RetornoBznResponse, TratamentoBznResponse, AtendimentoCriadoResponse,
  PacienteAtualizadoResponse, PacienteCriadoResponse } from '../clinico/dto/clinico.response';
import { csvCell } from './csv-cell';

@Perfis('consulta', 'edicao', 'administracao')
@Controller('pacientes')
export class PacientesController {
  constructor(private readonly pacientes: PacientesService) {}
  @Get()
  list(@Query() query: ListarPacientesQuery, @CurrentUser() user: AuthenticatedUser): Promise<PacienteResponse[]> {
    return this.pacientes.list(query, user);
  }
  @Get('export.csv') @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportCsv(@Query() query: ListarPacientesQuery, @CurrentUser() user: AuthenticatedUser): Promise<string> {
    const rows = await this.pacientes.exportCsv(user, query);
    return ['paciente_id,nome', ...rows.map((row) => `${csvCell(row.pacienteId)},${csvCell(row.nome)}`)].join('\n') + '\n';
  }
  @Get(':id') get(@Param('id', ClinicalIdPipe) id: string, @Query() query: PageQuery,
    @CurrentUser() user: AuthenticatedUser): Promise<PacienteDetalheResponse> {
    return this.pacientes.get(user, id, query);
  }
  @Get(':id/atendimentos') attendances(@Param('id', ClinicalIdPipe) id: string, @Query() query: PageQuery,
    @CurrentUser() user: AuthenticatedUser): Promise<AtendimentoResumoResponse[]> {
    return this.pacientes.attendances(user, id, query);
  }
  @Get(':id/retornos-bzn') bznReturns(@Param('id', ClinicalIdPipe) id: string, @Query() query: PageQuery,
    @CurrentUser() user: AuthenticatedUser): Promise<RetornoBznResponse[]> {
    return this.pacientes.bznReturns(user, id, query);
  }
  @Post(':id/retornos-bzn') @Perfis('edicao', 'administracao') createBznReturn(@Param('id', ClinicalIdPipe) id: string, @Body() dto: BznReturnDto,
    @CurrentUser() user: AuthenticatedUser): Promise<RetornoBznCriadoResponse> {
    return this.pacientes.createBznReturn(user, id, dto);
  }
  @Get(':id/tratamento-bzn') bznTreatment(@Param('id', ClinicalIdPipe) id: string, @CurrentUser() user: AuthenticatedUser): Promise<TratamentoBznResponse | null> {
    return this.pacientes.bznTreatment(user, id);
  }
  @Post(':id/tratamento-bzn') @Perfis('edicao', 'administracao') createBznTreatment(@Param('id', ClinicalIdPipe) id: string,
    @Body() dto: BznTreatmentCreateDto, @CurrentUser() user: AuthenticatedUser): Promise<{ tratamentoId: string }> {
    return this.pacientes.createBznTreatment(user, id, dto);
  }
  @Get(':id/exames') exams(@Param('id', ClinicalIdPipe) id: string, @Query() query: PageQuery,
    @CurrentUser() user: AuthenticatedUser): Promise<ExameResponse[]> {
    return this.pacientes.exams(user, id, query);
  }
  @Get(':id/pendencias') pending(@Param('id', ClinicalIdPipe) id: string, @Query() query: PendingQuery,
    @CurrentUser() user: AuthenticatedUser): Promise<PendenciaResponse[]> {
    return this.pacientes.pending(user, id, query);
  }
  @Put(':id/acesso/:usuarioId') @Perfis('administracao') setAccess(@Param('id', ClinicalIdPipe) id: string,
    @Param('usuarioId', ClinicalIdPipe) usuarioId: string, @Body() dto: AccessDto,
    @CurrentUser() user: AuthenticatedUser): Promise<{ pacienteId: string; usuarioId: string; ativo: boolean; podeEditar: boolean }> {
    return this.pacientes.setAccess(user, id, usuarioId, dto);
  }
  @Get(':id/atendimentos/:atendimentoId') attendance(@Param('id', ClinicalIdPipe) id: string,
    @Param('atendimentoId', ClinicalIdPipe) atendimentoId: string, @Query() query: PageQuery,
    @CurrentUser() user: AuthenticatedUser): Promise<AtendimentoDetalheResponse> {
    return this.pacientes.attendance(user, id, atendimentoId, query);
  }
  @Post(':id/atendimentos') @Perfis('edicao', 'administracao') createAttendance(@Param('id', ClinicalIdPipe) id: string, @Body() dto: AttendanceCreateDto,
    @CurrentUser() user: AuthenticatedUser): Promise<AtendimentoCriadoResponse> {
    return this.pacientes.createAttendance(user, id, dto);
  }
  @Patch(':id/atendimentos/:atendimentoId') @Perfis('edicao', 'administracao') updateAttendance(
    @Param('id', ClinicalIdPipe) id: string, @Param('atendimentoId', ClinicalIdPipe) atendimentoId: string,
    @Body() dto: AttendanceUpdateDto, @CurrentUser() user: AuthenticatedUser): Promise<{ atendimentoId: string; versao: string }> {
    return this.pacientes.updateAttendance(user, id, atendimentoId, dto);
  }
  @Post() @Perfis('edicao', 'administracao') create(@Body() dto: PatientCreateDto, @CurrentUser() user: AuthenticatedUser): Promise<PacienteCriadoResponse> {
    return this.pacientes.create(user, dto);
  }
  @Patch(':id') @Perfis('edicao', 'administracao') update(@Param('id', ClinicalIdPipe) id: string, @Body() dto: PatientUpdateDto,
    @CurrentUser() user: AuthenticatedUser): Promise<PacienteAtualizadoResponse> {
    return this.pacientes.update(user, id, dto);
  }
}
