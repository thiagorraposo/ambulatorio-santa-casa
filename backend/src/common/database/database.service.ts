import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, QueryResult, QueryResultRow } from 'pg';
import { AppConfig } from '../../config/app.config';

/** Consultas da mesma operacao usam a mesma conexao e a mesma transacao. */
export interface Transaction {
  query<T extends QueryResultRow = QueryResultRow>(text: string, values?: readonly unknown[]): Promise<QueryResult<T>>;
}

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;
  private readonly role: string;

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

  async transaction<T>(operation: (transaction: Transaction) => Promise<T>, actorId?: string): Promise<T> {
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
      const result = await operation(transaction);
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
