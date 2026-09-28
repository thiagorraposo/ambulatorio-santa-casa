import { Body, Controller, Get, Header, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ListarPacientesQuery } from './dto/listar-pacientes.query';
import { PacienteResponse } from './dto/paciente.response';
import { PacientesService } from './pacientes.service';
import { Perfis } from '../auth/perfis.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { ClinicalIdPipe } from '../clinico/clinical-validation';
import { AccessDto, AttendanceCreateDto, BznReturnDto, PatientCreateDto, PatientUpdateDto } from '../clinico/dto/clinico.dto';

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
    const quote = (value: string): string => `"${value.replace(/"/g, '""')}"`;
    return ['paciente_id,nome', ...rows.map((row) => `${quote(row.pacienteId)},${quote(row.nome)}`)].join('\n') + '\n';
  }
  @Get(':id') get(@Param('id', ClinicalIdPipe) id: string, @CurrentUser() user: AuthenticatedUser): Promise<Record<string, unknown>> {
    return this.pacientes.get(user, id);
  }
  @Get(':id/atendimentos') attendances(@Param('id', ClinicalIdPipe) id: string, @CurrentUser() user: AuthenticatedUser): Promise<Record<string, unknown>[]> {
    return this.pacientes.attendances(user, id);
  }
  @Get(':id/retornos-bzn') bznReturns(@Param('id', ClinicalIdPipe) id: string, @CurrentUser() user: AuthenticatedUser): Promise<Record<string, unknown>[]> {
    return this.pacientes.bznReturns(user, id);
  }
  @Post(':id/retornos-bzn') @Perfis('edicao', 'administracao') createBznReturn(@Param('id', ClinicalIdPipe) id: string, @Body() dto: BznReturnDto,
    @CurrentUser() user: AuthenticatedUser): Promise<Record<string, string>> {
    return this.pacientes.createBznReturn(user, id, dto);
  }
  @Get(':id/tratamento-bzn') bznTreatment(@Param('id', ClinicalIdPipe) id: string, @CurrentUser() user: AuthenticatedUser): Promise<Record<string, unknown> | null> {
    return this.pacientes.bznTreatment(user, id);
  }
  @Get(':id/projetos') projects(@Param('id', ClinicalIdPipe) id: string, @CurrentUser() user: AuthenticatedUser): Promise<Record<string, unknown>[]> {
    return this.pacientes.projects(user, id);
  }
  @Get(':id/exames') exams(@Param('id', ClinicalIdPipe) id: string, @CurrentUser() user: AuthenticatedUser): Promise<Record<string, unknown>[]> {
    return this.pacientes.exams(user, id);
  }
  @Get(':id/notificacao') notification(@Param('id', ClinicalIdPipe) id: string, @CurrentUser() user: AuthenticatedUser): Promise<Record<string, unknown> | null> {
    return this.pacientes.notification(user, id);
  }
  @Put(':id/acesso/:usuarioId') @Perfis('administracao') setAccess(@Param('id', ClinicalIdPipe) id: string,
    @Param('usuarioId', ClinicalIdPipe) usuarioId: string, @Body() dto: AccessDto,
    @CurrentUser() user: AuthenticatedUser): Promise<{ pacienteId: string; usuarioId: string; ativo: boolean; podeEditar: boolean }> {
    return this.pacientes.setAccess(user, id, usuarioId, dto);
  }
  @Get(':id/atendimentos/:atendimentoId') attendance(@Param('id', ClinicalIdPipe) id: string,
    @Param('atendimentoId', ClinicalIdPipe) atendimentoId: string, @CurrentUser() user: AuthenticatedUser): Promise<Record<string, unknown>> {
    return this.pacientes.attendance(user, id, atendimentoId);
  }
  @Post(':id/atendimentos') @Perfis('edicao', 'administracao') createAttendance(@Param('id', ClinicalIdPipe) id: string, @Body() dto: AttendanceCreateDto,
    @CurrentUser() user: AuthenticatedUser): Promise<Record<string, string>> {
    return this.pacientes.createAttendance(user, id, dto);
  }
  @Post() @Perfis('edicao', 'administracao') create(@Body() dto: PatientCreateDto, @CurrentUser() user: AuthenticatedUser): Promise<Record<string, unknown>> {
    return this.pacientes.create(user, dto);
  }
  @Patch(':id') @Perfis('edicao', 'administracao') update(@Param('id', ClinicalIdPipe) id: string, @Body() dto: PatientUpdateDto,
    @CurrentUser() user: AuthenticatedUser): Promise<Record<string, string>> {
    return this.pacientes.update(user, id, dto);
  }
}
