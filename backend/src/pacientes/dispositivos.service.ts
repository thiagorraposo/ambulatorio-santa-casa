import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { databaseConflict } from '../clinico/clinical-validation';
import { DispositivoCreateDto, DispositivoCriadoResponse, DispositivoResponse } from '../clinico/dto/dispositivo.dto';
import { PageQuery } from '../clinico/dto/clinico.dto';
import { DatabaseService, Transaction } from '../common/database/database.service';
import { ClinicalAccessService } from '../common/security/clinical-access.service';

@Injectable()
export class DispositivosService {
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
  async list(user: AuthenticatedUser, patientId: string, page: PageQuery): Promise<DispositivoResponse[]> {
    return this.patient(user, patientId, false, async tx => {
      const result = await tx.query<DispositivoResponse>(`SELECT dispositivo_implantado_id::text AS "dispositivoId",
        paciente_id::text AS "pacienteId",tipo_dispositivo AS "tipoDispositivo",possui_dispositivo AS "possuiDispositivo",observacoes
        FROM dispositivo_implantado WHERE paciente_id=$1 AND tipo_dispositivo IN ('marcapasso','cdi')
        ORDER BY dispositivo_implantado_id DESC LIMIT $2 OFFSET $3`, [patientId, page.limit, page.offset]);
      return result.rows;
    });
  }
  async create(user: AuthenticatedUser, patientId: string, dto: DispositivoCreateDto): Promise<DispositivoCriadoResponse> {
    return this.patient(user, patientId, true, async tx => {
      const result = await tx.query<{ id: string }>(`INSERT INTO dispositivo_implantado(paciente_id,tipo_dispositivo,
        possui_dispositivo,observacoes) VALUES($1,$2,$3,$4) RETURNING dispositivo_implantado_id::text AS id`,
      [patientId, dto.tipoDispositivo, dto.possuiDispositivo ?? null, dto.observacoes ?? null]);
      return { dispositivoId: result.rows[0].id };
    }).catch(error => {
      if ((error as { code?: string }).code === '23505') throw new ConflictException('Estado deste dispositivo já registrado; consulte o registro existente');
      throw error;
    });
  }
}
