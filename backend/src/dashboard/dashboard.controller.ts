import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { Perfis } from '../auth/perfis.decorator';
import { DashboardQuery, DashboardResponse } from './dashboard.dto';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@Perfis('consulta', 'edicao', 'administracao')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}
  @Get()
  get(@Query() query: DashboardQuery, @CurrentUser() user: AuthenticatedUser): Promise<DashboardResponse> {
    return this.dashboard.get(user, query);
  }
}
