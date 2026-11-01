import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { Perfis } from '../auth/perfis.decorator';
import { ClinicalIdPipe } from '../clinico/clinical-validation';
import { BznReactionDto, PageQuery } from '../clinico/dto/clinico.dto';
import { ReacoesBznService, ReacaoBznResponse } from './reacoes-bzn.service';

@Perfis('consulta', 'edicao', 'administracao')
@Controller('pacientes/:id/tratamento-bzn/reacoes')
export class ReacoesBznController {
  constructor(private readonly reacoes: ReacoesBznService) {}
  @Get()
  list(@Param('id', ClinicalIdPipe) patientId: string, @Query() page: PageQuery,
    @CurrentUser() user: AuthenticatedUser): Promise<ReacaoBznResponse[]> {
    return this.reacoes.list(user,patientId,page);
  }
  @Post() @Perfis('edicao', 'administracao')
  create(@Param('id', ClinicalIdPipe) patientId: string, @Body() dto: BznReactionDto,
    @CurrentUser() user: AuthenticatedUser): Promise<{reacaoId:string}> {
    return this.reacoes.create(user,patientId,dto);
  }
}
