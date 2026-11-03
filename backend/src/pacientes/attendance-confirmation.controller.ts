import { BadRequestException, Body, Controller, Headers, Param, Post } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { Perfis } from '../auth/perfis.decorator';
import { ClinicalIdPipe } from '../clinico/clinical-validation';
import { AttendanceConfirmationDto } from '../clinico/dto/attendance-confirmation.dto';
import { AttendanceConfirmationService } from './attendance-confirmation.service';

@Controller('pacientes/:id/atendimentos/confirmacao')
@Perfis('edicao', 'administracao')
export class AttendanceConfirmationController {
  constructor(private readonly confirmation: AttendanceConfirmationService) {}

  @Post()
  confirm(@Param('id', ClinicalIdPipe) patientId: string, @Body() dto: AttendanceConfirmationDto,
    @CurrentUser() user: AuthenticatedUser, @Headers('x-operacao-id') operationId?: string): Promise<Record<string, string>> {
    if (!operationId) throw new BadRequestException('Confirmação integrada exige uma operação correlacionada');
    return this.confirmation.confirm(user, patientId, dto);
  }
}
