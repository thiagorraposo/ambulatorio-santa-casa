import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { databaseConflict } from '../clinico/clinical-validation';
import { ObitoCreateDto, ObitoCriadoResponse, ObitoResponse } from '../clinico/dto/obito.dto';
import { DatabaseService, Transaction } from '../common/database/database.service';
import { ClinicalAccessService } from '../common/security/clinical-access.service';

@Injectable()
export class ObitoService {
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
  async read(user: AuthenticatedUser, patientId: string): Promise<ObitoResponse | null> {
    return this.patient(user, patientId, false, async tx => {
      const result = await tx.query<ObitoResponse>(`SELECT obito_id::text AS "obitoId",paciente_id::text AS "pacienteId",
        houve_obito AS "houveObito",data_obito::text AS "dataObito",causa_obito AS "causaObito",observacoes
        FROM obito WHERE paciente_id=$1`, [patientId]);
      return result.rows[0] ?? null;
    });
  }
  async create(user: AuthenticatedUser, patientId: string, dto: ObitoCreateDto): Promise<ObitoCriadoResponse> {
    return this.patient(user, patientId, true, async tx => {
      const choices = ([['houve_obito',dto.houveObito],['data_obito',dto.dataObito],
        ['causa_obito',dto.causaObito],['observacoes',dto.observacoes]] as const).filter(([,value])=>value!==undefined);
      if(!choices.length) throw new BadRequestException('Informe ao menos um campo do estado de óbito');
      const result = await tx.query<{id:string}>(`INSERT INTO obito(paciente_id,${choices.map(([key])=>key).join(',')})
        VALUES($1,${choices.map((_,i)=>`$${i+2}`).join(',')}) RETURNING obito_id::text AS id`,
        [patientId,...choices.map(([,value])=>value)]);
      return { obitoId:result.rows[0].id };
    }).catch(error=>{
      if((error as {code?:string}).code==='23505') throw new ConflictException('Estado de óbito já registrado; consulte o registro existente');
      throw error;
    });
  }
}
