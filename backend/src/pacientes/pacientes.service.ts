import { Injectable } from '@nestjs/common';
import { PacienteResponse } from './dto/paciente.response';
import { PacientesRepository } from './pacientes.repository';

@Injectable()
export class PacientesService {
  constructor(private readonly repository: PacientesRepository) {}
  async list(limit: number): Promise<PacienteResponse[]> {
    return (await this.repository.list(limit)).map((row) => ({
      pacienteId: row.paciente_id,
      nome: row.nome,
    }));
  }
}
