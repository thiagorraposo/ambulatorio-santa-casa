import { BadRequestException, ConflictException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { DatabaseService } from '../common/database/database.service';
import { ClinicalAccessService } from '../common/security/clinical-access.service';
import { databaseConflict } from '../clinico/clinical-validation';
import { AccessDto, AttendanceCreateDto, BznReturnDto, PatientCreateDto, PatientUpdateDto } from '../clinico/dto/clinico.dto';
import { PacienteResponse } from './dto/paciente.response';
import { PacientesRepository } from './pacientes.repository';
import { ListarPacientesQuery } from './dto/listar-pacientes.query';

@Injectable()
export class PacientesService {
  constructor(private readonly repository: PacientesRepository, @Optional() private readonly database?: DatabaseService,
    @Optional() private readonly access?: ClinicalAccessService) {}
  async list(query: ListarPacientesQuery, user: AuthenticatedUser): Promise<PacienteResponse[]> {
    if (!this.database || !this.access) throw new Error('Dependências clínicas indisponíveis');
    const result = await this.database.transaction(async (tx) => {
      await this.access!.identity(tx, user);
      return this.repository.listScoped(tx, query, user, this.access!);
    });
    return result.map((row) => ({ pacienteId: row.paciente_id, nome: row.nome }));
  }

  async exportCsv(user: AuthenticatedUser, query: ListarPacientesQuery): Promise<PacienteResponse[]> {
    if (!this.database || !this.access) throw new Error('Dependências clínicas indisponíveis');
    return this.database.transaction(async (tx) => {
      await this.access!.identity(tx, user);
      const values: unknown[] = []; const predicates: string[] = [];
      if (query.nome) { values.push(`%${query.nome}%`); predicates.push(`p.nome ILIKE $${values.length}`); }
      if (query.sexo) { values.push(query.sexo); predicates.push(`p.sexo=$${values.length}`); }
      if (this.access!.policy === 'vinculo_explicito' && user.perfil !== 'administracao') {
        values.push(user.usuarioId); predicates.push(`EXISTS (SELECT 1 FROM acesso_paciente ac WHERE ac.paciente_id=p.paciente_id AND ac.usuario_id=$${values.length} AND ac.ativo)`);
      }
      values.push(query.limit); const limitPosition = values.length;
      values.push(query.offset); const offsetPosition = values.length;
      const result = await tx.query<{ paciente_id: string; nome: string }>(`SELECT p.paciente_id::text,p.nome FROM paciente p
        ${predicates.length ? `WHERE ${predicates.join(' AND ')}` : ''} ORDER BY p.paciente_id LIMIT $${limitPosition} OFFSET $${offsetPosition}`, values);
      return result.rows.map((row) => ({ pacienteId: row.paciente_id, nome: row.nome }));
    });
  }

  async get(user: AuthenticatedUser, id: string): Promise<Record<string, unknown>> {
    if (!this.database || !this.access) throw new Error('Dependências clínicas indisponíveis');
    return this.database.transaction(async (tx) => {
      await this.access!.patient(tx, user, id);
      const row = await this.repository.find(tx, id);
      if (!row) throw new NotFoundException('Paciente não encontrado');
      const [address, contacts, attendances] = [
        await tx.query('SELECT endereco,cidade FROM paciente_endereco WHERE paciente_id=$1 ORDER BY endereco_id DESC LIMIT 1', [id]),
        await tx.query<{ telefone: string | null }>('SELECT telefone FROM paciente_contato WHERE paciente_id=$1 ORDER BY contato_id', [id]),
        await tx.query('SELECT atendimento_id::text,data_atendimento::text,observacoes,versao_registro::text FROM atendimento WHERE paciente_id=$1 ORDER BY data_atendimento DESC NULLS LAST, atendimento_id DESC', [id]),
      ];
      return { pacienteId: row.paciente_id, nome: row.nome, dataNascimento: row.data_nascimento, sexo: row.sexo,
        idade: row.idade, dataReferenciaIdade: row.data_referencia_idade,
        raca: row.raca, pertenceComunidadeTradicional: row.pertence_comunidade_tradicional,
        tipoComunidadeTradicional: row.tipo_comunidade_tradicional, versao: row.versao_registro,
        endereco: address.rows[0] ?? null, telefones: contacts.rows.map((x) => x.telefone),
        atendimentos: attendances.rows.map((x: Record<string, unknown>) => ({ atendimentoId: x.atendimento_id,
          dataAtendimento: x.data_atendimento, observacoes: x.observacoes, versao: x.versao_registro })) };
    });
  }

  async create(user: AuthenticatedUser, dto: PatientCreateDto): Promise<Record<string, unknown>> {
    if (!this.database || !this.access) throw new Error('Dependências clínicas indisponíveis');
    this.access.requireCreate(user);
    return this.database.transaction(async (tx) => {
      await this.access!.identity(tx, user, true);
      try {
        const r = await tx.query<{ paciente_id: string }>(`INSERT INTO paciente
          (nome,data_nascimento,sexo,raca,pertence_comunidade_tradicional,tipo_comunidade_tradicional)
          VALUES($1,$2,$3,$4,$5,$6) RETURNING paciente_id::text`, [dto.nome, dto.dataNascimento ?? null,
          dto.sexo ?? null, dto.raca ?? null, dto.pertenceComunidadeTradicional ?? null,
          dto.tipoComunidadeTradicional ?? null]);
        const id = r.rows[0].paciente_id;
        if (dto.endereco) await tx.query('INSERT INTO paciente_endereco(paciente_id,endereco,cidade) VALUES($1,$2,$3)', [id,dto.endereco.endereco ?? null,dto.endereco.cidade ?? null]);
        for (const telefone of dto.telefones ?? []) await tx.query('INSERT INTO paciente_contato(paciente_id,telefone) VALUES($1,$2)', [id,telefone]);
        return { pacienteId: id };
      } catch (error) { return databaseConflict(error); }
    }, user.usuarioId);
  }

  async update(user: AuthenticatedUser, id: string, dto: PatientUpdateDto): Promise<Record<string, string>> {
    if (!this.database || !this.access) throw new Error('Dependências clínicas indisponíveis');
    return this.database.transaction(async (tx) => {
      await this.access!.patient(tx, user, id, true);
      const fields: string[] = []; const values: unknown[] = [];
      for (const [column, value] of [['nome', dto.nome], ['data_nascimento', dto.dataNascimento], ['sexo', dto.sexo], ['raca', dto.raca]] as const) {
        if (value !== undefined) { values.push(value); fields.push(`${column}=$${values.length}`); }
      }
      if (!fields.length) throw new ConflictException('Nenhuma alteração informada');
      values.push(id, dto.versao);
      const r = await tx.query<{ versao_registro: string }>(`UPDATE paciente SET ${fields.join(',')} WHERE paciente_id=$${values.length-1} AND versao_registro=$${values.length} RETURNING versao_registro::text`, values);
      if (!r.rowCount) throw new ConflictException('Versão do paciente está desatualizada');
      return { pacienteId: id, versao: r.rows[0].versao_registro };
    }, user.usuarioId);
  }

  async attendances(user: AuthenticatedUser, patientId: string): Promise<Record<string, unknown>[]> {
    if (!this.database || !this.access) throw new Error('Dependências clínicas indisponíveis');
    return this.database.transaction(async (tx) => {
      await this.access!.patient(tx, user, patientId);
      const result = await tx.query(`SELECT atendimento_id::text,data_atendimento::text,localizacao_prontuario,
        ambulatorio_unicamente,ambulatorio_anexo_projeto,observacoes,versao_registro::text
        FROM atendimento WHERE paciente_id=$1 ORDER BY data_atendimento DESC NULLS LAST,atendimento_id DESC`, [patientId]);
      return result.rows.map((x: Record<string, unknown>) => ({ atendimentoId: x.atendimento_id,
        dataAtendimento: x.data_atendimento, localizacaoProntuario: x.localizacao_prontuario,
        ambulatorioUnicamente: x.ambulatorio_unicamente, ambulatorioAnexoProjeto: x.ambulatorio_anexo_projeto,
        observacoes: x.observacoes, versao: x.versao_registro }));
    });
  }

  async createAttendance(user: AuthenticatedUser, patientId: string, dto: AttendanceCreateDto): Promise<Record<string, string>> {
    if (!this.database || !this.access) throw new Error('Dependências clínicas indisponíveis');
    return this.database.transaction(async (tx) => {
      await this.access!.patient(tx, user, patientId, true);
      try {
        const a = await tx.query<{ atendimento_id: string }>(`INSERT INTO atendimento
          (paciente_id,data_atendimento,localizacao_prontuario,ambulatorio_unicamente,ambulatorio_anexo_projeto,origem_registro,observacoes)
          VALUES($1,$2,$3,$4,$5,'cadastro_sistema',$6) RETURNING atendimento_id::text`, [patientId,dto.dataAtendimento,
            dto.localizacaoProntuario ?? null,dto.ambulatorioUnicamente ?? null,dto.ambulatorioAnexoProjeto ?? null,dto.observacoes ?? null]);
        const id = a.rows[0].atendimento_id;
        const c = dto.dadosClinicos;
        if (c) await tx.query(`INSERT INTO dados_clinicos_atendimento(atendimento_id,altura_cm,peso_kg,circunferencia_abdominal_cm,
          frequencia_cardiaca_bpm,saturacao_percentual,pa_sistolica_mmhg,pa_diastolica_mmhg,nyha,observacoes)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [id,c.alturaCm ?? null,c.pesoKg ?? null,c.circunferenciaAbdominalCm ?? null,
          c.frequenciaCardiacaBpm ?? null,c.saturacaoPercentual ?? null,c.paSistolicaMmhg ?? null,c.paDiastolicaMmhg ?? null,c.nyha ?? null,c.observacoes ?? null]);
        const d = dto.diagnosticoChagas;
        if (d) await tx.query(`INSERT INTO diagnostico_chagas
          (atendimento_id,possui_diagnostico_chagas,status_diagnostico,resultado_final,data_resultado_final,
           data_descoberta_autorelato,criterio_confirmacao,observacoes)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [id,d.possuiDiagnosticoChagas ?? null,d.statusDiagnostico ?? null,
          d.resultadoFinal ?? null,d.dataResultadoFinal ?? null,d.dataDescobertaAutorelato ?? null,
          d.criterioConfirmacao ?? null,d.observacoes ?? null]);
        for (const e of dto.exames ?? []) {
          const catalog = await tx.query<{ codigo_exame: string }>(
            'SELECT codigo_exame FROM tipo_exame_complementar WHERE tipo_exame_complementar_id=$1 AND ativo FOR SHARE', [e.tipoExameId]);
          const code = catalog.rows[0]?.codigo_exame;
          if (!code || (['laboratoriais', 'imagem', 'outro', 'nao_informado'].includes(code) && !e.identificacao?.trim())) {
            throw new BadRequestException('Exame deve possuir identificação inequívoca e tipo ativo');
          }
          await tx.query(`INSERT INTO paciente_exame_complementar
          (paciente_id,atendimento_id,tipo_exame_complementar_id,bloco_origem,tipo_exame_original,resultado_texto,observacoes)
          VALUES($1,$2,$3,$4,$5,$6,$7)`, [patientId,e.atendimentoId ?? id,e.tipoExameId,e.bloco,e.identificacao ?? null,e.resultado ?? null,e.observacoes ?? null]);
        }
        for (const p of dto.pendencias ?? []) await tx.query(`INSERT INTO pendencia_atendimento
          (atendimento_id,descricao,status_pendencia,data_identificacao) VALUES($1,$2,$3,$4)`, [id,p.descricao,p.status ?? 'aberta',dto.dataAtendimento]);
        if (dto.rastreioFamiliar) {
          const f = dto.rastreioFamiliar;
          const fr = await tx.query<{ rastreio_familiar_id: string }>(`INSERT INTO rastreio_familiar
            (paciente_id,atendimento_id,familiares_examinados) VALUES($1,$2,$3) RETURNING rastreio_familiar_id::text`, [patientId,id,f.familiaresExaminados]);
          for (const item of f.familiares) await tx.query(`INSERT INTO rastreio_familiar_resultado
            (rastreio_familiar_id,identificacao_familiar,resultado_sorologia) VALUES($1,$2,$3)`, [fr.rows[0].rastreio_familiar_id,item.familiar,item.resultado]);
        }
        return { atendimentoId: id };
      } catch (error) { return databaseConflict(error); }
    }, user.usuarioId).catch(databaseConflict);
  }

  async attendance(user: AuthenticatedUser, patientId: string, attendanceId: string): Promise<Record<string, unknown>> {
    if (!this.database || !this.access) throw new Error('Dependências clínicas indisponíveis');
    return this.database.transaction(async (tx) => {
      await this.access!.patient(tx, user, patientId);
      const attendance = await tx.query(`SELECT atendimento_id::text,data_atendimento::text,localizacao_prontuario,
        ambulatorio_unicamente,ambulatorio_anexo_projeto,observacoes,versao_registro::text
        FROM atendimento WHERE atendimento_id=$1 AND paciente_id=$2`, [attendanceId, patientId]);
      if (!attendance.rows[0]) throw new NotFoundException('Atendimento não encontrado');
      const [clinical, diagnosis, exams, pending, family, familyResults] = [
        await tx.query(`SELECT altura_cm,peso_kg,circunferencia_abdominal_cm,frequencia_cardiaca_bpm,saturacao_percentual,
          pa_sistolica_mmhg,pa_diastolica_mmhg,nyha,observacoes FROM dados_clinicos_atendimento WHERE atendimento_id=$1`, [attendanceId]),
        await tx.query(`SELECT possui_diagnostico_chagas,status_diagnostico,resultado_final,data_resultado_final::text,
          data_descoberta_autorelato::text,criterio_confirmacao,observacoes
          FROM diagnostico_chagas WHERE atendimento_id=$1`, [attendanceId]),
        await tx.query(`SELECT e.paciente_exame_complementar_id::text,e.bloco_origem,e.tipo_exame_original,
          e.resultado_texto,e.observacoes,t.codigo_exame,t.nome_exame FROM paciente_exame_complementar e
          JOIN tipo_exame_complementar t ON t.tipo_exame_complementar_id=e.tipo_exame_complementar_id
          WHERE e.paciente_id=$1 AND e.atendimento_id=$2 ORDER BY e.paciente_exame_complementar_id`, [patientId, attendanceId]),
        await tx.query(`SELECT pendencia_atendimento_id::text,descricao,status_pendencia,data_identificacao::text
          FROM pendencia_atendimento WHERE atendimento_id=$1 ORDER BY pendencia_atendimento_id`, [attendanceId]),
        await tx.query(`SELECT rastreio_familiar_id::text,familiares_examinados FROM rastreio_familiar WHERE paciente_id=$1 AND atendimento_id=$2`, [patientId, attendanceId]),
        await tx.query(`SELECT r.rastreio_familiar_id::text,identificacao_familiar,resultado_sorologia
          FROM rastreio_familiar_resultado r JOIN rastreio_familiar f USING(rastreio_familiar_id)
          WHERE f.paciente_id=$1 AND f.atendimento_id=$2 ORDER BY r.rastreio_familiar_resultado_id`, [patientId, attendanceId]),
      ];
      const a = attendance.rows[0] as Record<string, unknown>;
      return { atendimentoId: a.atendimento_id, dataAtendimento: a.data_atendimento,
        localizacaoProntuario: a.localizacao_prontuario, ambulatorioUnicamente: a.ambulatorio_unicamente,
        ambulatorioAnexoProjeto: a.ambulatorio_anexo_projeto, observacoes: a.observacoes, versao: a.versao_registro,
        dadosClinicos: clinical.rows[0] ?? null, diagnosticoChagas: diagnosis.rows[0] ?? null,
        exames: exams.rows, pendencias: pending.rows,
        rastreioFamiliar: family.rows[0] ? { ...family.rows[0], familiares: familyResults.rows } : null };
    });
  }

  async bznReturns(user: AuthenticatedUser, patientId: string): Promise<Record<string, unknown>[]> {
    if (!this.database || !this.access) throw new Error('Dependências clínicas indisponíveis');
    return this.database.transaction(async (tx) => {
      await this.access!.patient(tx, user, patientId);
      const result = await tx.query(`SELECT c.acompanhamento_cuidado_id::text,c.atendimento_id::text,
        c.data_realizada::text,c.tipo_acompanhamento,c.resumo_acompanhamento,c.status_acompanhamento
        FROM acompanhamento_cuidado c JOIN atendimento a USING(atendimento_id)
        WHERE a.paciente_id=$1 AND c.tipo_acompanhamento IN ('retorno_bzn_30_dias','retorno_bzn_final')
        ORDER BY c.data_realizada DESC NULLS LAST,c.acompanhamento_cuidado_id DESC`, [patientId]);
      return result.rows.map((r: Record<string, unknown>) => ({ retornoId: r.acompanhamento_cuidado_id,
        atendimentoId: r.atendimento_id, dataRealizada: r.data_realizada, tipo: r.tipo_acompanhamento,
        resumo: r.resumo_acompanhamento, status: r.status_acompanhamento }));
    });
  }

  async createBznReturn(user: AuthenticatedUser, patientId: string, dto: BznReturnDto): Promise<Record<string, string>> {
    if (!this.database || !this.access) throw new Error('Dependências clínicas indisponíveis');
    return this.database.transaction(async (tx) => {
      await this.access!.patient(tx, user, patientId, true);
      try {
        const attendance = await tx.query('SELECT 1 FROM atendimento WHERE atendimento_id=$1 AND paciente_id=$2', [dto.atendimentoId, patientId]);
        if (!attendance.rowCount) throw new ConflictException('Atendimento não pertence ao paciente');
        const treatment = await tx.query('SELECT 1 FROM tratamento_benzonidazol WHERE paciente_id=$1 FOR SHARE', [patientId]);
        if (!treatment.rowCount) throw new ConflictException('Retorno exige tratamento BZN do paciente');
        const result = await tx.query<{ acompanhamento_cuidado_id: string }>(`INSERT INTO acompanhamento_cuidado
          (atendimento_id,data_realizada,retorno_programado,compareceu,status_acompanhamento,tipo_acompanhamento,resumo_acompanhamento)
          VALUES($1,$2,false,true,'concluido',$3,$4) RETURNING acompanhamento_cuidado_id::text`,
          [dto.atendimentoId,dto.dataRealizada,dto.tipo,dto.resumo ?? null]);
        return { retornoId: result.rows[0].acompanhamento_cuidado_id };
      } catch (error) { return databaseConflict(error); }
    }, user.usuarioId);
  }

  async bznTreatment(user: AuthenticatedUser, patientId: string): Promise<Record<string, unknown> | null> {
    if (!this.database || !this.access) throw new Error('Dependências clínicas indisponíveis');
    return this.database.transaction(async (tx) => {
      await this.access!.patient(tx, user, patientId);
      const treatment = await tx.query(`SELECT tratamento_benzonidazol_id::text,atendimento_id::text,tem_indicacao,
        iniciado,tratamento_pelo_ambulatorio,duracao_cumprida_dias,ano_uso_aproximado,data_prescricao::text,
        motivo_nao_indicacao,motivo_nao_inicio,teve_reacao_adversa,observacoes
        FROM tratamento_benzonidazol WHERE paciente_id=$1`, [patientId]);
      if (!treatment.rows[0]) return null;
      const reactions = await tx.query(`SELECT reacao_adversa_benzonidazol_id::text,descricao,gravidade,
        data_reacao::text,consequencia,observacoes FROM reacao_adversa_benzonidazol
        WHERE tratamento_benzonidazol_id=$1 ORDER BY reacao_adversa_benzonidazol_id`, [treatment.rows[0].tratamento_benzonidazol_id]);
      return { ...treatment.rows[0], reacoes: reactions.rows };
    });
  }

  async projects(user: AuthenticatedUser, patientId: string): Promise<Record<string, unknown>[]> {
    if (!this.database || !this.access) throw new Error('Dependências clínicas indisponíveis');
    return this.database.transaction(async (tx) => {
      await this.access!.patient(tx, user, patientId);
      const result = await tx.query(`SELECT p.paciente_projeto_estudo_id::text,pr.codigo_projeto,pr.nome_projeto,
        p.participa,p.possui_pendencia,p.descricao_pendencia,p.houve_falha,p.descricao_falha,p.observacoes
        FROM paciente_projeto_estudo p JOIN projeto_estudo pr USING(projeto_estudo_id)
        WHERE p.paciente_id=$1 ORDER BY pr.nome_projeto,p.paciente_projeto_estudo_id`, [patientId]);
      return result.rows;
    });
  }

  async exams(user: AuthenticatedUser, patientId: string): Promise<Record<string, unknown>[]> {
    if (!this.database || !this.access) throw new Error('Dependências clínicas indisponíveis');
    return this.database.transaction(async (tx) => {
      await this.access!.patient(tx, user, patientId);
      const result = await tx.query(`SELECT e.paciente_exame_complementar_id::text,e.atendimento_id::text,
        e.bloco_origem,e.tipo_exame_original,e.resultado_texto,e.observacoes,t.codigo_exame,t.nome_exame
        FROM paciente_exame_complementar e JOIN tipo_exame_complementar t USING(tipo_exame_complementar_id)
        WHERE e.paciente_id=$1 ORDER BY e.criado_em DESC,e.paciente_exame_complementar_id DESC`, [patientId]);
      return result.rows;
    });
  }

  async notification(user: AuthenticatedUser, patientId: string): Promise<Record<string, unknown> | null> {
    if (!this.database || !this.access) throw new Error('Dependências clínicas indisponíveis');
    return this.database.transaction(async (tx) => {
      await this.access!.patient(tx, user, patientId);
      const result = await tx.query(`SELECT notificacao_id::text,paciente_notificado,numero_notificacao,
        justificativa_nao_notificacao,observacoes FROM notificacao WHERE paciente_id=$1`, [patientId]);
      return result.rows[0] ?? null;
    });
  }

  async setAccess(user: AuthenticatedUser, patientId: string, targetUserId: string, dto: AccessDto): Promise<{ pacienteId: string; usuarioId: string; ativo: boolean; podeEditar: boolean }> {
    if (!this.database || !this.access) throw new Error('Dependências clínicas indisponíveis');
    if (user.perfil !== 'administracao') throw new ConflictException('Somente administração pode alterar vínculos');
    return this.database.transaction(async (tx) => {
      await this.access!.identity(tx, user, true);
      await tx.query('SET LOCAL ROLE ambulatorio_servico_autenticado');
      await tx.query('SELECT definir_acesso_paciente($1::bigint,$2::bigint,$3::boolean,$4::boolean)',
        [patientId, targetUserId, dto.podeEditar, dto.ativo]);
      await tx.query('SET LOCAL ROLE ambulatorio_aplicacao');
      return { pacienteId: patientId, usuarioId: targetUserId, ativo: dto.ativo, podeEditar: dto.podeEditar };
    }, user.usuarioId);
  }
}
