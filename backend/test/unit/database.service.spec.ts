import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../src/common/database/database.service';
import { AppConfig } from '../../src/config/app.config';

describe('DatabaseService', () => {
  const config = { get: jest.fn().mockReturnValue({
    host: 'localhost', port: 5432, name: 'db', user: 'login', password: 'synthetic',
    role: 'ambulatorio_aplicacao',
  }) } as unknown as ConfigService<AppConfig, true>;

  const serviceWith = (query: jest.Mock) => {
    const release = jest.fn();
    const service = new DatabaseService(config);
    Object.defineProperty(service, 'pool', { value: { connect: jest.fn().mockResolvedValue({ query, release }) } });
    return { service, release };
  };

  it('limita role e search_path à transação antes de devolver a conexão ao pool', async () => {
    const result = { rows: [{ current_user: 'ambulatorio_aplicacao' }] };
    const query = jest.fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(result)
      .mockResolvedValueOnce(undefined);
    const { service, release } = serviceWith(query);

    await expect(service.query('SELECT current_user')).resolves.toBe(result);
    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      'BEGIN',
      'SET LOCAL ROLE ambulatorio_aplicacao',
      'SET LOCAL search_path TO ambulatorio, public',
      'SELECT current_user',
      'COMMIT',
    ]);
    expect(release).toHaveBeenCalledWith(undefined);
  });

  it('executa rollback após falha e descarta a conexão se a limpeza falhar', async () => {
    const queryFailure = new Error('falha sintética');
    const cleanupFailure = new Error('rollback indisponível');
    const query = jest.fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(queryFailure)
      .mockRejectedValueOnce(cleanupFailure);
    const { service, release } = serviceWith(query);

    await expect(service.query('SELECT 1')).rejects.toBe(queryFailure);
    expect(query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(release).toHaveBeenCalledWith(cleanupFailure);
  });

  it('confirma varias escritas na mesma transacao somente depois da operacao completa', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [] });
    const { service, release } = serviceWith(query);
    await expect(service.transaction(async (tx) => {
      await tx.query('INSERT primeiro', ['sintetico']);
      await tx.query('INSERT segundo', [42]);
      return 'concluido';
    })).resolves.toBe('concluido');
    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      'BEGIN', 'SET LOCAL ROLE ambulatorio_aplicacao',
      'SET LOCAL search_path TO ambulatorio, public',
      'INSERT primeiro', 'INSERT segundo', 'COMMIT',
    ]);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('reverte a primeira escrita quando a segunda falha, preservando a falha original', async () => {
    const failure = new Error('falha sintetica da segunda escrita');
    const query = jest.fn().mockImplementation(async (sql: string) => {
      if (sql === 'INSERT segundo') throw failure;
      return { rows: [] };
    });
    const { service, release } = serviceWith(query);
    await expect(service.transaction(async (tx) => {
      await tx.query('INSERT primeiro');
      await tx.query('INSERT segundo');
    })).rejects.toBe(failure);
    expect(query.mock.calls.map(([sql]) => sql)).not.toContain('COMMIT');
    expect(query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(release).toHaveBeenCalledWith(undefined);
  });
});
