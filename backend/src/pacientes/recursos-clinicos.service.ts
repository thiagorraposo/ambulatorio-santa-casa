import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { databaseConflict } from '../clinico/clinical-validation';
import { PageQuery } from '../clinico/dto/clinico.dto';
import { AnnualAttendanceDto, AnnualReturnDto, ClinicalEventsQuery, CounterReferralDto, NotificationDto, PendingCreateDto, PendingUpdateDto,
  ProjectDto, ReferralDto, ReferralQuery } from '../clinico/dto/recursos.dto';
import { AnnualReturnResponse, ClinicalEventResponse, CounterReferralResponse, NotificationResponse, ProjectResponse, ReferralResponse } from '../clinico/dto/recursos.response';
import { DatabaseService, Transaction } from '../common/database/database.service';
import { ClinicalAccessService } from '../common/security/clinical-access.service';

@Injectable()
export class RecursosClinicosService {
  constructor(private readonly database: DatabaseService, private readonly access: ClinicalAccessService) {}

  private async patientOperation<T>(user: AuthenticatedUser, patientId: string, write: boolean,
    operation: (tx: Transaction) => Promise<T>): Promise<T> {
    return this.database.transaction(async tx => {
      await this.access.patient(tx, user, patientId, write);
      const patient = await tx.query('SELECT 1 FROM paciente WHERE paciente_id=$1', [patientId]);
      if (!patient.rowCount) throw new NotFoundException('Paciente não encontrado');
      return operation(tx);
    }, write ? user.usuarioId : undefined).catch(databaseConflict);
  }

  private async attendanceExists(tx: Transaction, patientId: string, attendanceId: string): Promise<void> {
    const result = await tx.query('SELECT 1 FROM atendimento WHERE paciente_id=$1 AND atendimento_id=$2 FOR SHARE', [patientId, attendanceId]);
    if (!result.rowCount) throw new NotFoundException('Atendimento não encontrado');
  }

  private async referralAttendance(tx: Transaction, patientId: string, referralId: string): Promise<string> {
    const result = await tx.query<{ atendimento_id: string }>(`SELECT e.atendimento_id::text FROM encaminhamento e
      JOIN atendimento a USING(atendimento_id) WHERE a.paciente_id=$1 AND e.encaminhamento_id=$2 FOR SHARE OF e`, [patientId, referralId]);
    if (!result.rows[0]) throw new NotFoundException('Encaminhamento não encontrado');
    return result.rows[0].atendimento_id;
  }

  async projects(user: AuthenticatedUser, patientId: string, page: PageQuery): Promise<ProjectResponse[]> {
    return this.patientOperation(user, patientId, false, async tx => {
      const result = await tx.query<ProjectResponse>(`SELECT p.projeto_estudo_id::text AS "projetoId",pr.codigo_projeto AS codigo,
        pr.nome_projeto AS nome,p.participa,p.possui_pendencia AS "possuiPendencia",p.descricao_pendencia AS "descricaoPendencia",
        p.houve_falha AS "houveFalha",p.descricao_falha AS "descricaoFalha",p.observacoes
        FROM paciente_projeto_estudo p JOIN projeto_estudo pr USING(projeto_estudo_id)
        WHERE p.paciente_id=$1 ORDER BY pr.nome_projeto,p.projeto_estudo_id LIMIT $2 OFFSET $3`, [patientId,page.limit,page.offset]);
      return result.rows;
    });
  }

  async saveProject(user: AuthenticatedUser, patientId: string, dto: ProjectDto): Promise<{ projetoId: string }> {
    return this.patientOperation(user, patientId, true, async tx => {
      const project = await tx.query('SELECT 1 FROM projeto_estudo WHERE projeto_estudo_id=$1 AND ativo FOR SHARE', [dto.projetoId]);
      if (!project.rowCount) throw new BadRequestException('Projeto ativo não encontrado');
      const columns = [
        ['participa', dto.participa], ['possui_pendencia', dto.possuiPendencia], ['descricao_pendencia', dto.descricaoPendencia],
        ['houve_falha', dto.houveFalha], ['descricao_falha', dto.descricaoFalha], ['observacoes', dto.observacoes],
      ] as const;
      const changes = columns.filter(([, value]) => value !== undefined);
      if (!changes.length) throw new BadRequestException('Nenhum estado de projeto informado');
      const values = changes.map(([, value]) => value);
      const insertColumns = changes.map(([column]) => column).join(',');
      const insertPositions = changes.map((_, i) => `$${i + 3}`).join(',');
      const updates = changes.map(([column]) => `${column}=EXCLUDED.${column}`).join(',');
      await tx.query(`INSERT INTO paciente_projeto_estudo(paciente_id,projeto_estudo_id,${insertColumns})
        VALUES($1,$2,${insertPositions}) ON CONFLICT(paciente_id,projeto_estudo_id)
        DO UPDATE SET ${updates},atualizado_em=CURRENT_TIMESTAMP`, [patientId,dto.projetoId,...values]);
      return { projetoId: dto.projetoId };
    });
  }

  async notification(user: AuthenticatedUser, patientId: string): Promise<NotificationResponse | null> {
    return this.patientOperation(user, patientId, false, async tx => {
      const result = await tx.query<NotificationResponse>(`SELECT notificacao_id::text AS "notificacaoId",
        paciente_notificado AS "pacienteNotificado",numero_notificacao AS "numeroNotificacao",
        justificativa_nao_notificacao AS "justificativaNaoNotificacao",observacoes
        FROM notificacao WHERE paciente_id=$1`, [patientId]);
      return result.rows[0] ?? null;
    });
  }

  async saveNotification(user: AuthenticatedUser, patientId: string, dto: NotificationDto): Promise<{ notificacaoId: string }> {
    return this.patientOperation(user, patientId, true, async tx => {
      const columns = [
        ['paciente_notificado', dto.pacienteNotificado], ['numero_notificacao', dto.numeroNotificacao],
        ['justificativa_nao_notificacao', dto.justificativaNaoNotificacao], ['observacoes', dto.observacoes],
      ] as const;
      const changes = columns.filter(([, value]) => value !== undefined);
      if (!changes.length) throw new BadRequestException('Nenhum estado de notificação informado');
      const values = changes.map(([, value]) => value);
      const names = changes.map(([name]) => name).join(',');
      const positions = changes.map((_, i) => `$${i + 2}`).join(',');
      const updates = changes.map(([name]) => `${name}=EXCLUDED.${name}`).join(',');
      const result = await tx.query<{ notificacao_id: string }>(`INSERT INTO notificacao(paciente_id,${names}) VALUES($1,${positions})
        ON CONFLICT(paciente_id) DO UPDATE SET ${updates},atualizado_em=CURRENT_TIMESTAMP
        RETURNING notificacao_id::text`, [patientId,...values]);
      return { notificacaoId: result.rows[0].notificacao_id };
    });
  }

  async referrals(user: AuthenticatedUser, patientId: string, query: ReferralQuery): Promise<ReferralResponse[]> {
    return this.patientOperation(user, patientId, false, async tx => {
      const result = await tx.query<ReferralResponse>(`SELECT e.encaminhamento_id::text AS "encaminhamentoId",
        e.atendimento_id::text AS "atendimentoId",e.tipo_encaminhamento_id::text AS "tipoEncaminhamentoId",
        e.projeto_estudo_id::text AS "projetoId",e.origem_encaminhamento AS origem,e.destino_nome AS "destinoNome",
        e.destino_servico AS "destinoServico",e.especialidade_destino AS "especialidadeDestino",
        e.data_encaminhamento::text AS "dataEncaminhamento",e.data_agendamento::text AS "dataAgendamento",
        e.data_realizacao::text AS "dataRealizacao",e.status_encaminhamento AS status,e.prioridade,
        e.documento_apresentado AS "documentoApresentado",e.motivo,e.conduta_orientada AS "condutaOrientada",e.observacoes
        FROM encaminhamento e JOIN atendimento a USING(atendimento_id)
        WHERE a.paciente_id=$1 AND ($2::text IS NULL OR e.status_encaminhamento=$2)
        ORDER BY e.data_encaminhamento DESC NULLS LAST,e.encaminhamento_id DESC LIMIT $3 OFFSET $4`,
      [patientId,query.status ?? null,query.limit,query.offset]);
      return result.rows;
    });
  }

  async createReferral(user: AuthenticatedUser, patientId: string, dto: ReferralDto): Promise<{ encaminhamentoId: string }> {
    return this.patientOperation(user, patientId, true, async tx => {
      await this.attendanceExists(tx, patientId, dto.atendimentoId);
      if (dto.projetoId) {
        const project = await tx.query('SELECT 1 FROM projeto_estudo WHERE projeto_estudo_id=$1 AND ativo FOR SHARE', [dto.projetoId]);
        if (!project.rowCount) throw new BadRequestException('Projeto ativo não encontrado');
      }
      if (dto.tipoEncaminhamentoId) {
        const type = await tx.query('SELECT 1 FROM tipo_encaminhamento WHERE tipo_encaminhamento_id=$1 AND ativo FOR SHARE', [dto.tipoEncaminhamentoId]);
        if (!type.rowCount) throw new BadRequestException('Tipo de encaminhamento ativo não encontrado');
      }
      const result = await tx.query<{ encaminhamento_id: string }>(`INSERT INTO encaminhamento
        (atendimento_id,tipo_encaminhamento_id,projeto_estudo_id,origem_encaminhamento,destino_nome,destino_servico,
         especialidade_destino,data_encaminhamento,data_agendamento,data_realizacao,status_encaminhamento,
         prioridade,documento_apresentado,motivo,conduta_orientada,observacoes)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING encaminhamento_id::text`,
      [dto.atendimentoId,dto.tipoEncaminhamentoId ?? null,dto.projetoId ?? null,dto.origem ?? null,
        dto.destinoNome ?? null,dto.destinoServico ?? null,dto.especialidadeDestino ?? null,dto.dataEncaminhamento ?? null,
        dto.dataAgendamento ?? null,dto.dataRealizacao ?? null,dto.status ?? null,dto.prioridade ?? null,
        dto.documentoApresentado ?? null,dto.motivo ?? null,dto.condutaOrientada ?? null,dto.observacoes ?? null]);
      return { encaminhamentoId: result.rows[0].encaminhamento_id };
    });
  }

  async counterReferrals(user: AuthenticatedUser, patientId: string, referralId: string, page: PageQuery): Promise<CounterReferralResponse[]> {
    return this.patientOperation(user, patientId, false, async tx => {
      await this.referralAttendance(tx, patientId, referralId);
      const result = await tx.query<CounterReferralResponse>(`SELECT c.acompanhamento_cuidado_id::text AS "contrarreferenciaId",
        c.encaminhamento_id::text AS "encaminhamentoId",c.atendimento_id::text AS "atendimentoId",
        c.data_realizada::text AS "dataRealizada",c.status_acompanhamento AS status,
        c.resumo_acompanhamento AS resumo,c.conduta,c.observacoes FROM acompanhamento_cuidado c
        WHERE c.encaminhamento_id=$1 AND c.tipo_acompanhamento='contrarreferencia'
        ORDER BY c.data_realizada DESC NULLS LAST,c.acompanhamento_cuidado_id DESC LIMIT $2 OFFSET $3`,
      [referralId,page.limit,page.offset]);
      return result.rows;
    });
  }

  async createCounterReferral(user: AuthenticatedUser, patientId: string, referralId: string,
    dto: CounterReferralDto): Promise<{ contrarreferenciaId: string }> {
    return this.patientOperation(user, patientId, true, async tx => {
      const attendanceId = await this.referralAttendance(tx, patientId, referralId);
      if (!Object.values(dto).some(value => value !== undefined)) throw new BadRequestException('Nenhum dado de contrarreferência informado');
      const result = await tx.query<{ acompanhamento_cuidado_id: string }>(`INSERT INTO acompanhamento_cuidado
        (atendimento_id,encaminhamento_id,data_realizada,status_acompanhamento,tipo_acompanhamento,
         resumo_acompanhamento,conduta,observacoes) VALUES($1,$2,$3,$4,'contrarreferencia',$5,$6,$7)
        RETURNING acompanhamento_cuidado_id::text`,
      [attendanceId,referralId,dto.dataRealizada ?? null,dto.status ?? null,dto.resumo ?? null,dto.conduta ?? null,dto.observacoes ?? null]);
      return { contrarreferenciaId: result.rows[0].acompanhamento_cuidado_id };
    });
  }

  async clinicalEvents(user: AuthenticatedUser, patientId: string, query: ClinicalEventsQuery): Promise<ClinicalEventResponse[]> {
    return this.patientOperation(user, patientId, false, async tx => {
      const result = await tx.query<{ eventoId: string; tipo: 'ultimo_comparecimento_ano_informado'; ano: number }>(`
        SELECT evento_clinico_id::text AS "eventoId",tipo_evento AS tipo,ano_evento AS ano FROM evento_clinico
        WHERE paciente_id=$1 AND tipo_evento='ultimo_comparecimento_ano_informado'
        ORDER BY criado_em DESC,evento_clinico_id DESC LIMIT $2 OFFSET $3`, [patientId,query.limit,query.offset]);
      return result.rows.map(row => ({ ...row, precisao: 'ano' as const }));
    });
  }

  async recordAnnualAttendance(user: AuthenticatedUser, patientId: string, dto: AnnualAttendanceDto): Promise<{ eventoId: string }> {
    return this.patientOperation(user, patientId, true, async tx => {
      const year = await tx.query<{ ano_atual: number }>('SELECT extract(year FROM CURRENT_DATE)::int AS ano_atual');
      if (dto.ano > year.rows[0].ano_atual) throw new BadRequestException('Ano informado não pode ser futuro');
      const result = await tx.query<{ evento_clinico_id: string }>(`INSERT INTO evento_clinico
        (paciente_id,tipo_evento,ano_evento,ocorreu) VALUES($1,'ultimo_comparecimento_ano_informado',$2,NULL)
        RETURNING evento_clinico_id::text`, [patientId,dto.ano]);
      return { eventoId: result.rows[0].evento_clinico_id };
    });
  }

  async annualReturns(user: AuthenticatedUser, patientId: string, page: PageQuery): Promise<AnnualReturnResponse[]> {
    return this.patientOperation(user, patientId, false, async tx => {
      const result = await tx.query<AnnualReturnResponse>(`SELECT c.acompanhamento_cuidado_id::text AS "retornoId",
        c.atendimento_id::text AS "atendimentoId",c.data_realizada::text AS "dataRealizada",
        c.resumo_acompanhamento AS resumo FROM acompanhamento_cuidado c
        JOIN atendimento a USING(atendimento_id) WHERE a.paciente_id=$1 AND c.tipo_acompanhamento='retorno_anual'
        ORDER BY c.data_realizada DESC,c.acompanhamento_cuidado_id DESC LIMIT $2 OFFSET $3`,
      [patientId,page.limit,page.offset]);
      return result.rows;
    });
  }

  async createAnnualReturn(user: AuthenticatedUser, patientId: string, dto: AnnualReturnDto): Promise<{ retornoId: string }> {
    return this.patientOperation(user, patientId, true, async tx => {
      await this.attendanceExists(tx, patientId, dto.atendimentoId);
      const result = await tx.query<{ acompanhamento_cuidado_id: string }>(`INSERT INTO acompanhamento_cuidado
        (atendimento_id,data_realizada,compareceu,status_acompanhamento,tipo_acompanhamento,resumo_acompanhamento)
        VALUES($1,$2,true,'concluido','retorno_anual',$3) RETURNING acompanhamento_cuidado_id::text`,
      [dto.atendimentoId,dto.dataRealizada,dto.resumo ?? null]);
      return { retornoId: result.rows[0].acompanhamento_cuidado_id };
    });
  }

  async createPending(user: AuthenticatedUser, patientId: string, dto: PendingCreateDto): Promise<{ pendenciaId: string }> {
    return this.patientOperation(user, patientId, true, async tx => {
      await this.attendanceExists(tx, patientId, dto.atendimentoId);
      if (!dto.descricao.trim()) throw new BadRequestException('Descrição da pendência é obrigatória');
      const result = await tx.query<{ pendencia_atendimento_id: string }>(`INSERT INTO pendencia_atendimento
        (atendimento_id,descricao,status_pendencia,data_identificacao) VALUES($1,$2,$3,$4)
        RETURNING pendencia_atendimento_id::text`,
      [dto.atendimentoId,dto.descricao,dto.status ?? 'aberta',dto.dataIdentificacao ?? null]);
      return { pendenciaId: result.rows[0].pendencia_atendimento_id };
    });
  }

  async updatePending(user: AuthenticatedUser, patientId: string, pendingId: string,
    dto: PendingUpdateDto): Promise<{ pendenciaId: string; status: string }> {
    return this.patientOperation(user, patientId, true, async tx => {
      if (dto.status === 'resolvida' && !dto.dataResolucao) throw new BadRequestException('Resolução exige data informada');
      if (dto.status !== 'resolvida' && dto.dataResolucao) throw new BadRequestException('Data de resolução exige status resolvida');
      const result = await tx.query(`UPDATE pendencia_atendimento p SET status_pendencia=$3,data_resolucao=$4,
        atualizado_em=CURRENT_TIMESTAMP FROM atendimento a WHERE p.atendimento_id=a.atendimento_id
        AND a.paciente_id=$1 AND p.pendencia_atendimento_id=$2 RETURNING p.pendencia_atendimento_id`,
      [patientId,pendingId,dto.status,dto.dataResolucao ?? null]);
      if (!result.rowCount) throw new NotFoundException('Pendência não encontrada');
      return { pendenciaId: pendingId, status: dto.status };
    });
  }
}
