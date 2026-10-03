import { Injectable } from '@nestjs/common';
import { DatabaseService, Transaction } from '../common/database/database.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { ClinicalAccessService } from '../common/security/clinical-access.service';

interface PacienteRow { paciente_id: string; nome: string }
export interface PacienteCompletoRow { paciente_id: string; nome: string; data_nascimento: string | null;
  sexo: string | null; raca: string | null; pertence_comunidade_tradicional: boolean | null;
  tipo_comunidade_tradicional: string | null; versao_registro: string;
  idade: number | null; data_referencia_idade: string }

@Injectable()
export class PacientesRepository {
  constructor(private readonly database: DatabaseService) {}
  async listScoped(tx: Transaction, query: { limit: number; offset: number; nome?: string; sexo?: string },
    user: AuthenticatedUser, access: ClinicalAccessService): Promise<PacienteRow[]> {
    const values: unknown[] = []; const predicates: string[] = [];
    if (query.nome) { values.push(`%${query.nome}%`); predicates.push(`p.nome ILIKE $${values.length}`); }
    if (query.sexo) { values.push(query.sexo); predicates.push(`p.sexo=$${values.length}`); }
    const scope = access.scope(user, values.length + 1, 'p');
    predicates.push(scope.sql); values.push(...scope.values);
    values.push(query.limit); const limitPosition = values.length;
    values.push(query.offset); const offsetPosition = values.length;
    const result = await tx.query<PacienteRow>(`SELECT p.paciente_id::text,p.nome FROM paciente p
      WHERE ${predicates.join(' AND ')} ORDER BY p.paciente_id LIMIT $${limitPosition} OFFSET $${offsetPosition}`, values);
    return result.rows;
  }
  async find(tx: Transaction, id: string): Promise<PacienteCompletoRow | undefined> {
    const result = await tx.query<PacienteCompletoRow>(`SELECT paciente_id::text,nome,data_nascimento::text,
      sexo,raca,pertence_comunidade_tradicional,tipo_comunidade_tradicional,versao_registro::text,
      CASE WHEN data_nascimento<=CURRENT_DATE THEN extract(year FROM age(CURRENT_DATE,data_nascimento))::int END AS idade,
      CURRENT_DATE::text AS data_referencia_idade
      FROM paciente WHERE paciente_id=$1`, [id]);
    return result.rows[0];
  }
}
