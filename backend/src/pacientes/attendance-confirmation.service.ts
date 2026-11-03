import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { AttendanceConfirmationDto } from '../clinico/dto/attendance-confirmation.dto';
import { DatabaseService } from '../common/database/database.service';
import { ClinicalAccessService } from '../common/security/clinical-access.service';
import { PacientesService } from './pacientes.service';
import { CondicaoChagasService } from './condicao-chagas.service';
import { SorologiasService } from './sorologias.service';
import { ComplicacoesChagasService } from './complicacoes-chagas.service';
import { ComorbidadesService } from './comorbidades.service';
import { AvcsService } from './avcs.service';
import { DispositivosService } from './dispositivos.service';
import { ObitoService } from './obito.service';
import { RecursosClinicosService } from './recursos-clinicos.service';

/** Reuses domain services and their access checks, with a single PostgreSQL transaction. */
@Injectable()
export class AttendanceConfirmationService {
  constructor(private readonly database: DatabaseService, private readonly patients: PacientesService,
    private readonly condition: CondicaoChagasService, private readonly serology: SorologiasService,
    private readonly complications: ComplicacoesChagasService, private readonly comorbidities: ComorbidadesService,
    private readonly avcs: AvcsService, private readonly devices: DispositivosService,
    private readonly death: ObitoService, private readonly resources: RecursosClinicosService,
    private readonly access: ClinicalAccessService) {}

  async confirm(user: AuthenticatedUser, patientId: string, dto: AttendanceConfirmationDto): Promise<Record<string, string>> {
    if (dto.exames?.some(exam => exam.atendimentoId !== undefined)) {
      throw new BadRequestException('Exames da confirmação pertencem ao novo atendimento');
    }
    if (dto.tratamentoBzn && !Object.keys(dto.tratamentoBzn).length) {
      throw new BadRequestException('Informe dados do tratamento BZN');
    }
    return this.database.coordinate(user.usuarioId, async tx => {
      await this.access.patient(tx, user, patientId, true);
      // Acquire before child INSERTs/FK locks to avoid lock-upgrade deadlocks in concurrent confirmations.
      const patient = await tx.query('SELECT 1 FROM paciente WHERE paciente_id=$1 FOR UPDATE', [patientId]);
      if (!patient.rowCount) throw new NotFoundException('Paciente não encontrado');
      const result: Record<string, string> = { ...await this.patients.createAttendance(user, patientId, dto) };
      const attendanceId = result.atendimentoId;
      if (dto.condicaoChagas) Object.assign(result, await this.condition.create(user, patientId, attendanceId, dto.condicaoChagas));
      for (const [index, value] of (dto.sorologias ?? []).entries()) {
        result[`sorologia${index}Id`] = (await this.serology.create(user, patientId, attendanceId, value)).sorologiaId;
      }
      for (const [index, value] of (dto.complicacoesChagas ?? []).entries()) {
        result[`complicacao${index}Id`] = (await this.complications.create(user, patientId, attendanceId, value)).complicacaoChagasId;
      }
      if (dto.comorbidades) Object.assign(result, await this.comorbidities.create(user, patientId, attendanceId, dto.comorbidades));
      for (const [index, value] of (dto.avcs ?? []).entries()) {
        const duplicate = await tx.query(`SELECT 1 FROM evento_clinico WHERE paciente_id=$1 AND tipo_evento='avc'
          AND ocorreu IS NOT DISTINCT FROM $2::boolean AND ano_evento IS NOT DISTINCT FROM $3::integer
          AND descricao IS NOT DISTINCT FROM $4::text AND observacoes IS NOT DISTINCT FROM $5::text`,
        [patientId, value.ocorreu ?? null, value.anoEvento ?? null, value.descricao ?? null, value.observacoes ?? null]);
        if (duplicate.rowCount) throw new ConflictException('AVC com os mesmos dados já registrado; consulte o histórico');
        result[`avc${index}Id`] = (await this.avcs.create(user, patientId, value)).eventoId;
      }
      for (const [index, value] of (dto.dispositivos ?? []).entries()) {
        result[`dispositivo${index}Id`] = (await this.devices.create(user, patientId, value)).dispositivoId;
      }
      if (dto.obito) Object.assign(result, await this.death.create(user, patientId, dto.obito));
      for (const [index, value] of (dto.projetos ?? []).entries()) {
        result[`projeto${index}Id`] = (await this.resources.saveProject(user, patientId, value, true)).projetoId;
      }
      if (dto.tratamentoBzn) Object.assign(result, await this.patients.createBznTreatment(user, patientId, dto.tratamentoBzn));
      for (const [index, value] of (dto.encaminhamentos ?? []).entries()) {
        result[`encaminhamento${index}Id`] = (await this.resources.createReferral(user, patientId, { ...value, atendimentoId: attendanceId })).encaminhamentoId;
      }
      if (dto.notificacao) Object.assign(result, await this.resources.saveNotification(user, patientId, dto.notificacao, true));
      return result;
    });
  }
}
