import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { databaseConflict } from '../clinico/clinical-validation';
import { AvcCreateDto, AvcCriadoResponse, AvcResponse } from '../clinico/dto/avc.dto';
import { PageQuery } from '../clinico/dto/clinico.dto';
import { DatabaseService, Transaction } from '../common/database/database.service';
import { ClinicalAccessService } from '../common/security/clinical-access.service';

@Injectable()
export class AvcsService {
  constructor(private readonly database: DatabaseService, private readonly access: ClinicalAccessService) {}
  private async patient<T>(user: AuthenticatedUser, patientId: string, write: boolean,
    operation: (tx: Transaction) => Promise<T>): Promise<T> {
    return this.database.transaction(async tx => {
      await this.access.patient(tx, user, patientId, write);
      const patient = await tx.query('SELECT 1 FROM paciente WHERE paciente_id=$1 FOR SHARE', [patientId]);
      if (!patient.rowCount) throw new NotFoundException('Paciente não encontrado');
      return operation(tx);
    }, write ? user.usuarioId : undefined).catch(databaseConflict);
  }
  async list(user: AuthenticatedUser, patientId: string, page: PageQuery): Promise<AvcResponse[]> {
    return this.patient(user, patientId, false, async tx => {
      const result = await tx.query<AvcResponse>(`SELECT evento_clinico_id::text AS "eventoId",
        paciente_id::text AS "pacienteId",tipo_evento AS tipo,ocorreu,ano_evento AS "anoEvento",descricao,observacoes
        FROM evento_clinico WHERE paciente_id=$1 AND tipo_evento='avc'
        ORDER BY evento_clinico_id DESC LIMIT $2 OFFSET $3`, [patientId, page.limit, page.offset]);
      return result.rows;
    });
  }
  async create(user: AuthenticatedUser, patientId: string, dto: AvcCreateDto): Promise<AvcCriadoResponse> {
    return this.patient(user, patientId, true, async tx => {
      const choices = ([['ocorreu', dto.ocorreu], ['ano_evento', dto.anoEvento],
        ['descricao', dto.descricao], ['observacoes', dto.observacoes]] as const).filter(([, value]) => value !== undefined);
      if (!choices.length) throw new BadRequestException('Informe ao menos um campo do registro de AVC');
      const result = await tx.query<{ id: string }>(`INSERT INTO evento_clinico(paciente_id,tipo_evento,${choices.map(([key]) => key).join(',')})
        VALUES($1,'avc',${choices.map((_, i) => `$${i + 2}`).join(',')}) RETURNING evento_clinico_id::text AS id`,
      [patientId, ...choices.map(([, value]) => value)]);
      return { eventoId: result.rows[0].id };
    });
  }
}
