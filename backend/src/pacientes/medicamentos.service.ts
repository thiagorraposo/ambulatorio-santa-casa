import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { databaseConflict } from '../clinico/clinical-validation';
import { PageQuery } from '../clinico/dto/clinico.dto';
import { MedicamentoResponse } from '../clinico/dto/medicamento.response';
import { DatabaseService } from '../common/database/database.service';
import { ClinicalAccessService } from '../common/security/clinical-access.service';

@Injectable()
export class MedicamentosService {
  constructor(private readonly database: DatabaseService, private readonly access: ClinicalAccessService) {}
  async list(user: AuthenticatedUser, patientId: string, attendanceId: string, page: PageQuery): Promise<MedicamentoResponse[]> {
    return this.database.transaction(async tx => {
      await this.access.patient(tx, user, patientId);
      const attendance = await tx.query('SELECT 1 FROM atendimento WHERE paciente_id=$1 AND atendimento_id=$2 FOR SHARE',
        [patientId, attendanceId]);
      if (!attendance.rowCount) throw new NotFoundException('Atendimento não encontrado');
      const result = await tx.query<MedicamentoResponse>(`SELECT
        a.atendimento_medicamento_id::text AS "atendimentoMedicamentoId",a.atendimento_id::text AS "atendimentoId",
        a.medicamento_id::text AS "medicamentoId",m.codigo_medicamento AS "codigoMedicamento",
        m.nome_medicamento AS "nomeMedicamento",m.principio_ativo AS "principioAtivo",
        m.classe_medicamento AS "classeMedicamento",a.nome_medicamento_livre AS "nomeMedicamentoLivre",
        a.tipo_registro AS "tipoRegistro",a.finalidade_uso AS "finalidadeUso",a.dose,
        a.via_administracao AS "viaAdministracao",a.frequencia,a.data_inicio::text AS "dataInicio",
        a.data_fim::text AS "dataFim",a.uso_atual AS "usoAtual",
        a.prescrito_no_atendimento AS "prescritoNoAtendimento",a.status_uso AS "statusUso",a.motivo,a.observacoes
        FROM atendimento_medicamento a LEFT JOIN medicamento m USING(medicamento_id)
        WHERE a.atendimento_id=$1 ORDER BY a.atendimento_medicamento_id DESC LIMIT $2 OFFSET $3`,
      [attendanceId, page.limit, page.offset]);
      return result.rows;
    }).catch(databaseConflict);
  }
}
