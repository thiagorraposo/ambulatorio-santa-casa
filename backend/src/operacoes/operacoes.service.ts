import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuthenticatedUser } from '../auth/auth.types';
import { ClinicalOperationContext } from '../common/database/clinical-operation.context';
import { DatabaseService, Transaction } from '../common/database/database.service';
import { ClinicalAccessService } from '../common/security/clinical-access.service';
import { RegisterOperationDto } from './dto/operacao.dto';
import { ClinicalMethod, clinicalRoute, operationReceipt, OperationReceipt, OperationResponse, payloadHash } from './operacoes.contract';

interface OperationRow {
  operacao_id: string;
  usuario_id: string;
  paciente_id: string | null;
  metodo: ClinicalMethod;
  caminho: string;
  corpo_hash: string;
  estado: 'registrada' | 'em_curso' | 'confirmada' | 'nao_aplicada';
  claim_id: string | null;
  resultado: OperationReceipt | null;
  motivo: 'falha' | 'expirada' | 'encerrada' | null;
  expira_em: Date;
  expirada: boolean;
}

const columns = `operacao_id::text,usuario_id::text,paciente_id::text,metodo,caminho,corpo_hash,
  estado,claim_id::text,resultado,motivo,expira_em,clock_timestamp()>=expira_em AS expirada`;
const locked = (error: unknown): boolean => typeof error === 'object' && error !== null
  && ['55P03','57014'].includes(String((error as { code?: string }).code));

@Injectable()
export class OperacoesService {
  constructor(private readonly database: DatabaseService, private readonly access: ClinicalAccessService) {}

  private async authorize(tx: Transaction, user: AuthenticatedUser, row: Pick<OperationRow, 'paciente_id'>, write: boolean): Promise<void> {
    if (row.paciente_id !== null) {
      await this.access.patient(tx, user, row.paciente_id, write);
    } else {
      await this.access.identity(tx, user, write);
      this.access.requireCreate(user);
    }
  }

  private async find(tx: Transaction, user: AuthenticatedUser, id: string, lock = ''): Promise<OperationRow> {
    const result = await tx.query<OperationRow>(`SELECT ${columns} FROM operacao_clinica
      WHERE operacao_id=$1 AND usuario_id=$2 ${lock}`, [id, user.usuarioId]);
    if (!result.rows[0]) throw new NotFoundException('Operação não disponível');
    return result.rows[0];
  }

  private response(row: OperationRow, state: OperationResponse['estado']): OperationResponse {
    return { operacaoId: row.operacao_id, metodo: row.metodo, caminho: row.caminho,
      corpoHash: row.corpo_hash, estado: state, expiraEm: row.expira_em.toISOString(),
      ...(state === 'confirmada' && row.resultado ? { resultado: row.resultado } : {}),
      ...(state === 'nao_aplicada' ? { motivo: row.motivo ?? 'expirada' } : {}) };
  }

  async register(user: AuthenticatedUser, dto: RegisterOperationDto): Promise<OperationResponse> {
    const route = clinicalRoute(dto.metodo, dto.caminho);
    try {
      return await this.database.transaction(async tx => {
        await this.authorize(tx, user, { paciente_id: route.patientId ?? null }, true);
        if (route.patientId) {
          const exists = await tx.query('SELECT 1 FROM paciente WHERE paciente_id=$1', [route.patientId]);
          if (!exists.rowCount) throw new NotFoundException('Paciente não encontrado');
        }
        const result = await tx.query<OperationRow>(`INSERT INTO operacao_clinica
          (operacao_id,usuario_id,paciente_id,metodo,caminho,corpo_hash)
          VALUES($1,$2,$3,$4,$5,$6) RETURNING ${columns}`,
        [dto.operacaoId,user.usuarioId,route.patientId ?? null,dto.metodo,dto.caminho,dto.corpoHash]);
        return this.response(result.rows[0], 'registrada');
      });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') throw new ConflictException('Identificador de operação já utilizado; consulte o resultado');
      throw error;
    }
  }

  /** Reads may lock, but never change the ledger or execute a clinical handler. */
  async get(user: AuthenticatedUser, id: string): Promise<OperationResponse> {
    return this.database.transaction(async tx => {
      const initial = await this.find(tx, user, id);
      await this.authorize(tx, user, initial, false);
      await tx.query('SAVEPOINT operation_read');
      let current: OperationRow;
      try {
        current = await this.find(tx, user, id, 'FOR SHARE NOWAIT');
      } catch (error) {
        await tx.query('ROLLBACK TO SAVEPOINT operation_read');
        if (!locked(error)) throw error;
        return this.response(initial, 'em_curso');
      }
      if (current.estado === 'confirmada' || current.estado === 'nao_aplicada') return this.response(current, current.estado);
      // SHARE excludes every writer of this row. A future clinical claim also
      // checks clock_timestamp() under UPDATE before touching clinical data.
      return this.response(current, current.expirada ? 'nao_aplicada' : 'indeterminavel');
    });
  }

  /** Explicit control-plane seal: competes with clinical COMMIT on the same row. */
  async close(user: AuthenticatedUser, id: string): Promise<OperationResponse> {
    return this.database.transaction(async tx => {
      const initial = await this.find(tx, user, id);
      await this.authorize(tx, user, initial, false);
      await tx.query('SAVEPOINT operation_close');
      let current: OperationRow;
      try {
        current = await this.find(tx, user, id, 'FOR UPDATE NOWAIT');
      } catch (error) {
        await tx.query('ROLLBACK TO SAVEPOINT operation_close');
        if (!locked(error)) throw error;
        return this.response(initial, 'em_curso');
      }
      if (current.estado === 'confirmada' || current.estado === 'nao_aplicada') return this.response(current, current.estado);
      const result = await tx.query<OperationRow>(`UPDATE operacao_clinica SET estado='nao_aplicada',motivo='encerrada',
        finalizada_em=clock_timestamp() WHERE operacao_id=$1 AND usuario_id=$2 RETURNING ${columns}`, [id,user.usuarioId]);
      return this.response(result.rows[0], 'nao_aplicada');
    });
  }

  async claim(user: AuthenticatedUser, id: string, method: string, path: string, body: unknown): Promise<ClinicalOperationContext> {
    const route = clinicalRoute(method, path);
    const hash = payloadHash(body);
    const claimId = randomUUID();
    try {
      await this.database.transaction(async tx => {
        const row = await this.find(tx, user, id, 'FOR UPDATE NOWAIT');
        await this.authorize(tx, user, row, true);
        if (row.metodo !== method || row.caminho !== path || row.corpo_hash !== hash) {
          throw new ConflictException('Método, caminho ou conteúdo diverge da intenção registrada');
        }
        if (row.estado !== 'registrada' || row.expirada) throw new ConflictException('Operação indisponível para envio; consulte o resultado');
        await tx.query(`UPDATE operacao_clinica SET estado='em_curso',claim_id=$3
          WHERE operacao_id=$1 AND usuario_id=$2`, [id,user.usuarioId,claimId]);
      });
    } catch (error) {
      if (locked(error)) throw new ConflictException('Operação em curso; consulte o resultado');
      throw error;
    }
    return {
      actorId: user.usuarioId,
      transactionStarted: false,
      before: async tx => {
        const row = await this.find(tx, user, id, 'FOR UPDATE NOWAIT');
        if (row.estado !== 'em_curso' || row.claim_id !== claimId || row.expirada) {
          throw new ConflictException('Operação encerrada ou expirada; consulte o resultado');
        }
      },
      after: async (tx, result) => {
        const receipt = operationReceipt(route, result);
        const persisted = await tx.query(`UPDATE operacao_clinica SET estado='confirmada',resultado=$3::jsonb,
          paciente_id=COALESCE(paciente_id,$4::bigint),finalizada_em=clock_timestamp()
          WHERE operacao_id=$1 AND usuario_id=$2 AND estado='em_curso' AND claim_id=$5`,
        [id,user.usuarioId,JSON.stringify(receipt),route.patientId ? null : receipt.pacienteId,claimId]);
        if (persisted.rowCount !== 1) throw new Error('Recibo clínico não foi associado à tentativa');
      },
    };
  }

  async failed(user: AuthenticatedUser, id: string): Promise<void> {
    // A lost COMMIT acknowledgement is not evidence of rollback. This conditional
    // UPDATE must first acquire the very same lock as the clinical transaction.
    // A confirmed COMMIT is therefore never replaced by a presumed failure.
    // If the lock/database is unavailable, no conclusion is persisted.
    try {
      await this.database.transaction(async tx => {
        await tx.query("SET LOCAL lock_timeout TO '200ms'");
        await tx.query(`UPDATE operacao_clinica SET estado='nao_aplicada',motivo='falha',finalizada_em=clock_timestamp()
          WHERE operacao_id=$1 AND usuario_id=$2 AND estado='em_curso'`, [id,user.usuarioId]);
      });
    } catch { /* Verification must keep an indeterminate result if proof is unavailable. */ }
  }
}
