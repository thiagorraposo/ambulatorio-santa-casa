import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, QueryResult, QueryResultRow } from 'pg';
import { AppConfig } from '../../config/app.config';

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
    const client = await this.pool.connect();
    let discardConnection: Error | undefined;
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL ROLE ${this.role}`);
      await client.query('SET LOCAL search_path TO ambulatorio, public');
      const result = await client.query<T>(text, [...values]);
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
