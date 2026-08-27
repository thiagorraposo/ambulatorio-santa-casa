import { Controller, Get, Query } from '@nestjs/common';
import { ListarPacientesQuery } from './dto/listar-pacientes.query';
import { PacienteResponse } from './dto/paciente.response';
import { PacientesService } from './pacientes.service';

@Controller('pacientes')
export class PacientesController {
  constructor(private readonly pacientes: PacientesService) {}
  @Get()
  list(@Query() query: ListarPacientesQuery): Promise<PacienteResponse[]> {
    return this.pacientes.list(query.limit);
  }
}
