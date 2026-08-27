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
    try {
      await client.query(`SET ROLE ${this.role}`);
      await client.query('SET search_path TO ambulatorio, public');
      return await client.query<T>(text, [...values]);
    } finally {
      try {
        await client.query('RESET ROLE');
      } finally {
        client.release();
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
