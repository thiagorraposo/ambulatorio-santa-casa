import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { Perfis } from '../auth/perfis.decorator';
import { ClinicalIdPipe } from '../clinico/clinical-validation';
import { PageQuery } from '../clinico/dto/clinico.dto';
import { AnnualAttendanceDto, AnnualReturnDto, ClinicalEventsQuery, CounterReferralDto, NotificationDto, PendingCreateDto, PendingUpdateDto,
  ProjectDto, ReferralDto, ReferralQuery } from '../clinico/dto/recursos.dto';
import { AnnualReturnResponse, ClinicalEventResponse, CounterReferralResponse, NotificationResponse, ProjectResponse, ReferralResponse } from '../clinico/dto/recursos.response';
import { RecursosClinicosService } from './recursos-clinicos.service';

@Perfis('consulta', 'edicao', 'administracao')
@Controller('pacientes/:id')
export class RecursosClinicosController {
  constructor(private readonly recursos: RecursosClinicosService) {}

  @Get('projetos')
  projects(@Param('id', ClinicalIdPipe) id: string, @Query() query: PageQuery,
    @CurrentUser() user: AuthenticatedUser): Promise<ProjectResponse[]> {
    return this.recursos.projects(user, id, query);
  }

  @Put('projetos') @Perfis('edicao', 'administracao')
  saveProject(@Param('id', ClinicalIdPipe) id: string, @Body() dto: ProjectDto,
    @CurrentUser() user: AuthenticatedUser): Promise<{ projetoId: string }> {
    return this.recursos.saveProject(user, id, dto);
  }

  @Get('notificacao')
  notification(@Param('id', ClinicalIdPipe) id: string,
    @CurrentUser() user: AuthenticatedUser): Promise<NotificationResponse | null> {
    return this.recursos.notification(user, id);
  }

  @Put('notificacao') @Perfis('edicao', 'administracao')
  saveNotification(@Param('id', ClinicalIdPipe) id: string, @Body() dto: NotificationDto,
    @CurrentUser() user: AuthenticatedUser): Promise<{ notificacaoId: string }> {
    return this.recursos.saveNotification(user, id, dto);
  }

  @Get('encaminhamentos')
  referrals(@Param('id', ClinicalIdPipe) id: string, @Query() query: ReferralQuery,
    @CurrentUser() user: AuthenticatedUser): Promise<ReferralResponse[]> {
    return this.recursos.referrals(user, id, query);
  }

  @Post('encaminhamentos') @Perfis('edicao', 'administracao')
  createReferral(@Param('id', ClinicalIdPipe) id: string, @Body() dto: ReferralDto,
    @CurrentUser() user: AuthenticatedUser): Promise<{ encaminhamentoId: string }> {
    return this.recursos.createReferral(user, id, dto);
  }

  @Get('encaminhamentos/:encaminhamentoId/contrarreferencias')
  counterReferrals(@Param('id', ClinicalIdPipe) id: string,
    @Param('encaminhamentoId', ClinicalIdPipe) referralId: string, @Query() query: PageQuery,
    @CurrentUser() user: AuthenticatedUser): Promise<CounterReferralResponse[]> {
    return this.recursos.counterReferrals(user, id, referralId, query);
  }

  @Post('encaminhamentos/:encaminhamentoId/contrarreferencias') @Perfis('edicao', 'administracao')
  createCounterReferral(@Param('id', ClinicalIdPipe) id: string,
    @Param('encaminhamentoId', ClinicalIdPipe) referralId: string, @Body() dto: CounterReferralDto,
    @CurrentUser() user: AuthenticatedUser): Promise<{ contrarreferenciaId: string }> {
    return this.recursos.createCounterReferral(user, id, referralId, dto);
  }

  @Get('ocorrencias-anuais')
  clinicalEvents(@Param('id', ClinicalIdPipe) id: string, @Query() query: ClinicalEventsQuery,
    @CurrentUser() user: AuthenticatedUser): Promise<ClinicalEventResponse[]> {
    return this.recursos.clinicalEvents(user, id, query);
  }

  @Post('ocorrencias-anuais') @Perfis('edicao', 'administracao')
  recordAnnualAttendance(@Param('id', ClinicalIdPipe) id: string, @Body() dto: AnnualAttendanceDto,
    @CurrentUser() user: AuthenticatedUser): Promise<{ eventoId: string }> {
    return this.recursos.recordAnnualAttendance(user, id, dto);
  }

  @Get('retornos-anuais')
  annualReturns(@Param('id', ClinicalIdPipe) id: string, @Query() query: PageQuery,
    @CurrentUser() user: AuthenticatedUser): Promise<AnnualReturnResponse[]> {
    return this.recursos.annualReturns(user, id, query);
  }

  @Post('retornos-anuais') @Perfis('edicao', 'administracao')
  createAnnualReturn(@Param('id', ClinicalIdPipe) id: string, @Body() dto: AnnualReturnDto,
    @CurrentUser() user: AuthenticatedUser): Promise<{ retornoId: string }> {
    return this.recursos.createAnnualReturn(user, id, dto);
  }

  @Post('pendencias') @Perfis('edicao', 'administracao')
  createPending(@Param('id', ClinicalIdPipe) id: string, @Body() dto: PendingCreateDto,
    @CurrentUser() user: AuthenticatedUser): Promise<{ pendenciaId: string }> {
    return this.recursos.createPending(user, id, dto);
  }

  @Patch('pendencias/:pendenciaId') @Perfis('edicao', 'administracao')
  updatePending(@Param('id', ClinicalIdPipe) id: string, @Param('pendenciaId', ClinicalIdPipe) pendingId: string,
    @Body() dto: PendingUpdateDto, @CurrentUser() user: AuthenticatedUser): Promise<{ pendenciaId: string; status: string }> {
    return this.recursos.updatePending(user, id, pendingId, dto);
  }
}
