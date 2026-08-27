import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../common/database/database.service';

@Injectable()
export class HealthService {
  constructor(private readonly database: DatabaseService) {}
  async check(): Promise<{ status: 'ok'; database: 'up' }> {
    try {
      await this.database.query('SELECT 1 AS ready');
      return { status: 'ok', database: 'up' };
    } catch {
      throw new ServiceUnavailableException('Banco de dados indisponível');
    }
  }
}
