import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../common/database/database.service';

interface PacienteRow { paciente_id: string; nome: string }

@Injectable()
export class PacientesRepository {
  constructor(private readonly database: DatabaseService) {}
  async list(limit: number): Promise<PacienteRow[]> {
    const result = await this.database.query<PacienteRow>(
      'SELECT paciente_id::text, nome FROM paciente ORDER BY paciente_id LIMIT $1', [limit]);
    return result.rows;
  }
}
