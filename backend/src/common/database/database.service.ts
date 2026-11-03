import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, QueryResult, QueryResultRow } from 'pg';
import { AppConfig } from '../../config/app.config';
import { clinicalOperationContext } from './clinical-operation.context';
import { AsyncLocalStorage } from 'node:async_hooks';

/** Consultas da mesma operacao usam a mesma conexao e a mesma transacao. */
export interface Transaction {
  query<T extends QueryResultRow = QueryResultRow>(text: string, values?: readonly unknown[]): Promise<QueryResult<T>>;
}

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;
  private readonly role: string;
  private readonly coordinated = new AsyncLocalStorage<{
    transaction: Transaction; actorId: string; active: boolean; failed: boolean;
  }>();

  constructor(config: ConfigService<AppConfig, true>) {
    const database = config.get('database', { infer: true });
    this.role = database.role;
    this.pool = new Pool({
      host: database.host,
      port: database.port,
      database: database.name,
      user: database.user,
      password: database.password,
      max: 10,
      connectionTimeoutMillis: 3000,
      idleTimeoutMillis: 10000,
    });
  }

  async query<T extends QueryResultRow>(text: string, values: readonly unknown[] = []): Promise<QueryResult<T>> {
    return this.transaction((transaction) => transaction.query<T>(text, values));
  }

  /** Explicit composition only: existing services share this actor's single COMMIT and receipt. */
  async coordinate<T>(actorId: string, operation: (transaction: Transaction) => Promise<T>): Promise<T> {
    if (this.coordinated.getStore()) throw new Error('Coordenação clínica aninhada não permitida');
    return this.transaction(async transaction => {
      const scope = { transaction, actorId, active: true, failed: false };
      try {
        return await this.coordinated.run(scope, async () => {
          const result = await operation(transaction);
          if (scope.failed) throw new Error('Uma operação clínica falhou; confirmação integral cancelada');
          return result;
        });
      } finally { scope.active = false; }
    }, actorId);
  }

  async transaction<T>(operation: (transaction: Transaction) => Promise<T>, actorId?: string): Promise<T> {
    const coordinated = this.coordinated.getStore();
    if (coordinated) {
      if (!coordinated.active || coordinated.failed || (actorId !== undefined && actorId !== coordinated.actorId)) {
        coordinated.failed = true;
        throw new Error('Transação coordenada indisponível ou ator divergente');
      }
      try { return await operation(coordinated.transaction); }
      catch (error) { coordinated.failed = true; throw error; }
    }
    // Guards and read-only auxiliary transactions do not consume the write scope.
    const linked = actorId === undefined ? undefined : clinicalOperationContext.getStore();
    if (linked) {
      if (linked.actorId !== actorId || linked.transactionStarted) {
        throw new Error('A operação deve conter exatamente uma transação clínica do ator');
      }
      linked.transactionStarted = true;
    }
    const client = await this.pool.connect();
    let discardConnection: Error | undefined;
    try {
      await client.query('BEGIN');
      if (actorId !== undefined) {
        await client.query('SET LOCAL ROLE ambulatorio_servico_autenticado');
        await client.query('SELECT ambulatorio.auditoria_iniciar_aplicacao($1::bigint)', [actorId]);
      }
      await client.query(`SET LOCAL ROLE ${this.role}`);
      await client.query('SET LOCAL search_path TO ambulatorio, public');
      const transaction: Transaction = {
        query: (text, values = []) => client.query(text, [...values]),
      };
      if (linked) await linked.before(transaction);
      const result = await operation(transaction);
      if (linked) await linked.after(transaction, result);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (cleanupError) {
        discardConnection = cleanupError instanceof Error
          ? cleanupError
          : new Error('Falha ao limpar conexão PostgreSQL');
      }
      throw error;
    } finally {
      client.release(discardConnection);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
