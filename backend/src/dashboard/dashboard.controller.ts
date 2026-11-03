import { Response } from 'express';
import { Controller, Get, Query, Res } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { Perfis } from '../auth/perfis.decorator';
import { DashboardQuery, DashboardResponse } from './dashboard.dto';
import { csvCell } from '../pacientes/csv-cell';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@Perfis('consulta', 'edicao', 'administracao')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}
  @Get('export.csv')
  async exportCsv(@Query() query: DashboardQuery, @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response): Promise<string> {
    const rows = await this.dashboard.exportCsv(user, query);
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', 'attachment; filename="dashboard-atendimentos.csv"');
    response.setHeader('Cache-Control', 'no-store');
    return ['paciente_id,nome,atendimento_id,data_atendimento,pendencias_abertas',
      ...rows.map(row => [row.pacienteId, row.nome, row.atendimentoId, row.dataAtendimento,
        String(row.pendenciasAbertas)].map(csvCell).join(','))].join('\n') + '\n';
  }

  @Get()
  get(@Query() query: DashboardQuery, @CurrentUser() user: AuthenticatedUser): Promise<DashboardResponse> {
    return this.dashboard.get(user, query);
  }
}
