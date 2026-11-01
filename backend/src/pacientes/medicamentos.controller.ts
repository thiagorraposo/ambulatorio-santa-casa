import { Controller, Get, Param, Query } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { Perfis } from '../auth/perfis.decorator';
import { ClinicalIdPipe } from '../clinico/clinical-validation';
import { PageQuery } from '../clinico/dto/clinico.dto';
import { MedicamentoResponse } from '../clinico/dto/medicamento.response';
import { MedicamentosService } from './medicamentos.service';

@Perfis('consulta', 'edicao', 'administracao')
@Controller('pacientes/:id/atendimentos/:atendimentoId/medicamentos')
export class MedicamentosController {
  constructor(private readonly medicamentos: MedicamentosService) {}
  @Get()
  list(@Param('id', ClinicalIdPipe) patientId: string,
    @Param('atendimentoId', ClinicalIdPipe) attendanceId: string, @Query() query: PageQuery,
    @CurrentUser() user: AuthenticatedUser): Promise<MedicamentoResponse[]> {
    return this.medicamentos.list(user, patientId, attendanceId, query);
  }
}
