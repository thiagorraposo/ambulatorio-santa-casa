import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { databaseConflict } from '../clinico/clinical-validation';
import { ComplicacaoChagasCreateDto } from '../clinico/dto/complicacao-chagas.dto';
import { ComplicacaoChagasCriadaResponse, ComplicacaoChagasResponse } from '../clinico/dto/complicacao-chagas.response';
import { DatabaseService, Transaction } from '../common/database/database.service';
import { PageQuery } from '../clinico/dto/clinico.dto';
import { ClinicalAccessService } from '../common/security/clinical-access.service';

@Injectable()
export class ComplicacoesChagasService {
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

  async list(user: AuthenticatedUser, patientId: string, attendanceId: string,
    page: PageQuery): Promise<ComplicacaoChagasResponse[]> {
    return this.attendance(user, patientId, attendanceId, false, async tx => {
      const result = await tx.query<ComplicacaoChagasResponse>(`SELECT complicacao_chagas_id::text AS "complicacaoChagasId",
        atendimento_id::text AS "atendimentoId",tipo_complicacao AS "tipoComplicacao",
        possui_complicacao AS "possuiComplicacao",descricao,gravidade FROM complicacao_chagas
        WHERE atendimento_id=$1 ORDER BY complicacao_chagas_id DESC LIMIT $2 OFFSET $3`,
      [attendanceId, page.limit, page.offset]);
      return result.rows;
    });
  }

  async create(user: AuthenticatedUser, patientId: string, attendanceId: string,
    dto: ComplicacaoChagasCreateDto): Promise<ComplicacaoChagasCriadaResponse> {
    return this.attendance(user, patientId, attendanceId, true, async tx => {
      const columns = [
        ['tipo_complicacao', dto.tipoComplicacao], ['possui_complicacao', dto.possuiComplicacao],
        ['descricao', dto.descricao], ['gravidade', dto.gravidade],
      ] as const;
      const choices = columns.filter(([, value]) => value !== undefined);
      if (!choices.length) throw new BadRequestException('Informe ao menos um campo da complicação');
      const names = choices.map(([name]) => name).join(',');
      const positions = choices.map((_, index) => `$${index + 2}`).join(',');
      const result = await tx.query<{ complicacao_chagas_id: string }>(`INSERT INTO complicacao_chagas
        (atendimento_id,${names}) VALUES($1,${positions}) RETURNING complicacao_chagas_id::text`,
      [attendanceId, ...choices.map(([, value]) => value)]);
      return { complicacaoChagasId: result.rows[0].complicacao_chagas_id };
    });
  }
}
