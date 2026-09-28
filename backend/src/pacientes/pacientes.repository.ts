import { Injectable } from '@nestjs/common';
import { DatabaseService, Transaction } from '../common/database/database.service';

interface PacienteRow { paciente_id: string; nome: string }
export interface PacienteCompletoRow { paciente_id: string; nome: string; data_nascimento: string | null;
  sexo: string | null; raca: string | null; pertence_comunidade_tradicional: boolean | null;
  tipo_comunidade_tradicional: string | null; versao_registro: string }

@Injectable()
export class PacientesRepository {
  constructor(private readonly database: DatabaseService) {}
  async list(limit: number, nome?: string, sexo?: string): Promise<PacienteRow[]> {
    const values: unknown[] = []; const predicates: string[] = [];
    if (nome) { values.push(`%${nome}%`); predicates.push(`nome ILIKE $${values.length}`); }
    if (sexo) { values.push(sexo); predicates.push(`sexo=$${values.length}`); }
    values.push(limit);
    const result = await this.database.query<PacienteRow>(
      `SELECT paciente_id::text,nome FROM paciente ${predicates.length ? `WHERE ${predicates.join(' AND ')}` : ''}
       ORDER BY paciente_id LIMIT $${values.length}`, values);
    return result.rows;
  }
  async find(tx: Transaction, id: string): Promise<PacienteCompletoRow | undefined> {
    const result = await tx.query<PacienteCompletoRow>(`SELECT paciente_id::text,nome,data_nascimento::text,
      sexo,raca,pertence_comunidade_tradicional,tipo_comunidade_tradicional,versao_registro::text
      FROM paciente WHERE paciente_id=$1`, [id]);
    return result.rows[0];
  }
}
