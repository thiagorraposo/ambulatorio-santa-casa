import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { databaseConflict } from '../clinico/clinical-validation';
import { PageQuery } from '../clinico/dto/clinico.dto';
import { SorologiaCreateDto } from '../clinico/dto/sorologia.dto';
import { SorologiaCriadaResponse, SorologiaResponse } from '../clinico/dto/sorologia.response';
import { DatabaseService, Transaction } from '../common/database/database.service';
import { ClinicalAccessService } from '../common/security/clinical-access.service';

@Injectable()
export class SorologiasService {
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

  async list(user: AuthenticatedUser, patientId: string, attendanceId: string, page: PageQuery): Promise<SorologiaResponse[]> {
    return this.attendance(user, patientId, attendanceId, false, async tx => {
      const result = await tx.query<SorologiaResponse>(`SELECT s.sorologia_chagas_id::text AS "sorologiaId",
        s.diagnostico_chagas_id::text AS "diagnosticoChagasId",d.atendimento_id::text AS "atendimentoId",
        s.metodo_sorologico AS "metodoSorologico",s.data_solicitacao::text AS "dataSolicitacao",
        s.data_coleta::text AS "dataColeta",s.data_resultado::text AS "dataResultado",
        s.resultado,s.laboratorio,s.observacoes
        FROM sorologia_chagas s JOIN diagnostico_chagas d USING(diagnostico_chagas_id)
        WHERE d.atendimento_id=$1 ORDER BY s.sorologia_chagas_id DESC LIMIT $2 OFFSET $3`,
      [attendanceId, page.limit, page.offset]);
      return result.rows;
    });
  }

  async create(user: AuthenticatedUser, patientId: string, attendanceId: string,
    dto: SorologiaCreateDto): Promise<SorologiaCriadaResponse> {
    return this.attendance(user, patientId, attendanceId, true, async tx => {
      const columns = [
        ['metodo_sorologico', dto.metodoSorologico], ['data_solicitacao', dto.dataSolicitacao],
        ['data_coleta', dto.dataColeta], ['data_resultado', dto.dataResultado], ['resultado', dto.resultado],
        ['laboratorio', dto.laboratorio], ['observacoes', dto.observacoes],
      ] as const;
      const choices = columns.filter(([, value]) => value !== undefined);
      if (!choices.length) throw new BadRequestException('Informe ao menos um campo da sorologia');
      let diagnosis = (await tx.query<{ diagnostico_chagas_id: string }>(
        'SELECT diagnostico_chagas_id::text FROM diagnostico_chagas WHERE atendimento_id=$1 FOR UPDATE',
        [attendanceId])).rows[0];
      if (!diagnosis) {
        // Technical parent only: no diagnosis, discovery or final result is inferred.
        diagnosis = (await tx.query<{ diagnostico_chagas_id: string }>(
          'INSERT INTO diagnostico_chagas(atendimento_id) VALUES($1) RETURNING diagnostico_chagas_id::text',
          [attendanceId])).rows[0];
      }
      const names = choices.map(([name]) => name).join(',');
      const positions = choices.map((_, index) => `$${index + 2}`).join(',');
      const result = await tx.query<{ sorologia_chagas_id: string }>(`INSERT INTO sorologia_chagas
        (diagnostico_chagas_id,${names}) VALUES($1,${positions}) RETURNING sorologia_chagas_id::text`,
      [diagnosis.diagnostico_chagas_id, ...choices.map(([, value]) => value)]);
      return { sorologiaId: result.rows[0].sorologia_chagas_id };
    });
  }
}
