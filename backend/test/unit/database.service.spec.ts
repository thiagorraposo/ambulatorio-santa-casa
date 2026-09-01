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
});
