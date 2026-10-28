import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { databaseConflict } from '../clinico/clinical-validation';
import { CondicaoChagasCreateDto } from '../clinico/dto/condicao-chagas.dto';
import { CondicaoChagasCriadaResponse, CondicaoChagasResponse } from '../clinico/dto/condicao-chagas.response';
import { DatabaseService, Transaction } from '../common/database/database.service';
import { ClinicalAccessService } from '../common/security/clinical-access.service';

@Injectable()
export class CondicaoChagasService {
  constructor(private readonly database: DatabaseService, private readonly access: ClinicalAccessService) {}

  private async attendance<T>(user: AuthenticatedUser, patientId: string, attendanceId: string,
    write: boolean, operation: (tx: Transaction) => Promise<T>): Promise<T> {
    return this.database.transaction(async tx => {
      await this.access.patient(tx, user, patientId, write);
      const attendance = await tx.query(`SELECT 1 FROM atendimento WHERE paciente_id=$1 AND atendimento_id=$2
        ${write ? 'FOR UPDATE' : 'FOR SHARE'}`, [patientId, attendanceId]);
      if (!attendance.rowCount) throw new NotFoundException('Atendimento não encontrado');
      return operation(tx);
    }, write ? user.usuarioId : undefined).catch(databaseConflict);
  }

  async read(user: AuthenticatedUser, patientId: string, attendanceId: string): Promise<CondicaoChagasResponse | null> {
    return this.attendance(user, patientId, attendanceId, false, async tx => {
      const result = await tx.query<CondicaoChagasResponse>(`SELECT condicao_chagas_id::text AS "condicaoChagasId",
        atendimento_id::text AS "atendimentoId",forma_clinica AS "formaClinica",fase_doenca AS "faseDoenca",
        classificacao_clinica AS "classificacaoClinica",possui_sintomas AS "possuiSintomas",
        descricao_sintomas AS "descricaoSintomas",observacoes FROM condicao_chagas WHERE atendimento_id=$1`, [attendanceId]);
      return result.rows[0] ?? null;
    });
  }

  async create(user: AuthenticatedUser, patientId: string, attendanceId: string,
    dto: CondicaoChagasCreateDto): Promise<CondicaoChagasCriadaResponse> {
    try {
      return await this.attendance(user, patientId, attendanceId, true, async tx => {
        const columns = [
          ['forma_clinica', dto.formaClinica], ['fase_doenca', dto.faseDoenca],
          ['classificacao_clinica', dto.classificacaoClinica], ['possui_sintomas', dto.possuiSintomas],
          ['descricao_sintomas', dto.descricaoSintomas], ['observacoes', dto.observacoes],
        ] as const;
        const choices = columns.filter(([, value]) => value !== undefined);
        if (!choices.length) throw new BadRequestException('Informe ao menos um campo da condição');
        const existing = await tx.query('SELECT 1 FROM condicao_chagas WHERE atendimento_id=$1', [attendanceId]);
        if (existing.rowCount) throw new ConflictException('Este atendimento já possui condição registrada');
        const names = choices.map(([name]) => name).join(',');
        const positions = choices.map((_, index) => `$${index + 2}`).join(',');
        const result = await tx.query<{ condicao_chagas_id: string }>(`INSERT INTO condicao_chagas
          (atendimento_id,${names}) VALUES($1,${positions}) RETURNING condicao_chagas_id::text`,
        [attendanceId, ...choices.map(([, value]) => value)]);
        return { condicaoChagasId: result.rows[0].condicao_chagas_id };
      });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505'
        && 'constraint' in error && error.constraint === 'uq_condicao_chagas_atendimento') {
        throw new ConflictException('Este atendimento já possui condição registrada');
      }
      throw error;
    }
  }
}
