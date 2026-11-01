import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { ClinicalIdPipe, databaseConflict } from '../clinico/clinical-validation';
import { ComorbidadesCreateDto, ComorbidadesCriadaResponse, ComorbidadesResponse } from '../clinico/dto/comorbidades.dto';
import { DatabaseService, Transaction } from '../common/database/database.service';
import { ClinicalAccessService } from '../common/security/clinical-access.service';

@Injectable()
export class ComorbidadesService {
  constructor(private readonly database: DatabaseService, private readonly access: ClinicalAccessService) {}
  private async attendance<T>(user: AuthenticatedUser, patientId: string, attendanceId: string,
    write: boolean, operation: (tx: Transaction) => Promise<T>): Promise<T> {
    return this.database.transaction(async tx => {
      await this.access.patient(tx, user, patientId, write);
      const attendance = await tx.query(`SELECT 1 FROM atendimento WHERE paciente_id=$1 AND atendimento_id=$2
        ${write ? 'FOR UPDATE' : 'FOR SHARE'}`, [patientId, attendanceId]);
      if (!attendance.rowCount) throw new NotFoundException('Atendimento não encontrado');
      return operation(tx);
    }, write ? user.usuarioId : undefined).catch(error => {
      if ((error as { code?: string }).code === '23505') throw new ConflictException('Avaliação já registrada neste atendimento');
      return databaseConflict(error);
    });
  }
  async get(user: AuthenticatedUser, patientId: string, attendanceId: string): Promise<ComorbidadesResponse | null> {
    return this.attendance(user, patientId, attendanceId, false, async tx => {
      const result = await tx.query<{ avaliacaoComorbidadesId: string; atendimentoId: string;
        familiarAvaliado: boolean; possuiDoenca: boolean | null; descricao: string | null }>(`
        SELECT avaliacao_comorbidades_id::text AS "avaliacaoComorbidadesId", atendimento_id::text AS "atendimentoId",
          historico_familiar_avaliado AS "familiarAvaliado",possui_doenca_familiar AS "possuiDoenca",
          descricao_historico_familiar AS descricao FROM avaliacao_comorbidades WHERE atendimento_id=$1`, [attendanceId]);
      const row = result.rows[0]; if (!row) return null;
      const items = await tx.query<ComorbidadesResponse['itens'][number]>(`SELECT item_id::text AS "itemId",
        comorbidade_id::text AS "comorbidadeId",nome_comorbidade AS "nomeComorbidade",
        possui_comorbidade AS "possuiComorbidade",observacoes FROM avaliacao_comorbidade_item
        WHERE avaliacao_comorbidades_id=$1 ORDER BY comorbidade_id`, [row.avaliacaoComorbidadesId]);
      return { avaliacaoComorbidadesId: row.avaliacaoComorbidadesId, atendimentoId: row.atendimentoId,
        itens: items.rows, historicoFamiliar: row.familiarAvaliado ? { possuiDoenca: row.possuiDoenca, descricao: row.descricao } : null };
    });
  }
  async create(user: AuthenticatedUser, patientId: string, attendanceId: string,
    dto: ComorbidadesCreateDto): Promise<ComorbidadesCriadaResponse> {
    return this.attendance(user, patientId, attendanceId, true, async tx => {
      const items = dto.itens ?? [];
      if (!items.length && !dto.historicoFamiliar) throw new BadRequestException('Informe itens ou histórico familiar');
      const ids = items.map(item => new ClinicalIdPipe().transform(item.comorbidadeId));
      if (new Set(ids).size !== ids.length) throw new BadRequestException('Comorbidade repetida na avaliação');
      const existing = await tx.query('SELECT 1 FROM avaliacao_comorbidades WHERE atendimento_id=$1', [attendanceId]);
      if (existing.rowCount) throw new ConflictException('Avaliação já registrada neste atendimento');
      // Ordem estável e lock compartilham a decisão de ativo com a cópia do nome.
      const catalog = await tx.query<{ id: string; nome: string }>(`SELECT comorbidade_id::text AS id,nome_comorbidade AS nome
        FROM comorbidade WHERE comorbidade_id=ANY($1::bigint[]) AND ativo ORDER BY comorbidade_id FOR SHARE`, [ids]);
      if (catalog.rows.length !== items.length) throw new BadRequestException('Comorbidade indisponível no catálogo');
      const names = new Map(catalog.rows.map(row => [row.id, row.nome]));
      const created = await tx.query<{ id: string }>(`INSERT INTO avaliacao_comorbidades(atendimento_id,
        historico_familiar_avaliado,possui_doenca_familiar,descricao_historico_familiar)
        VALUES($1,$2,$3,$4) RETURNING avaliacao_comorbidades_id::text AS id`,
      [attendanceId, dto.historicoFamiliar !== undefined, dto.historicoFamiliar?.possuiDoenca ?? null,
        dto.historicoFamiliar?.descricao ?? null]);
      const id = created.rows[0].id;
      for (const item of [...items].sort((a, b) => BigInt(a.comorbidadeId) < BigInt(b.comorbidadeId) ? -1 : 1)) {
        await tx.query(`INSERT INTO avaliacao_comorbidade_item(avaliacao_comorbidades_id,comorbidade_id,
          nome_comorbidade,possui_comorbidade,observacoes) VALUES($1,$2,$3,$4,$5)`,
        [id, item.comorbidadeId, names.get(item.comorbidadeId), item.possuiComorbidade, item.observacoes ?? null]);
      }
      return { avaliacaoComorbidadesId: id };
    });
  }
}
