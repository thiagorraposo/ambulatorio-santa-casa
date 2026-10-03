import { ServiceUnavailableException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ImportacoesService } from '../../src/importacoes/importacoes.service';

describe('ImportacoesService', () => {
  it('mantém o upload desabilitado sem configuração explícita', async () => {
    const service = new ImportacoesService({} as never, { get: () => ({ enabled: false }) } as never, {} as never);
    await expect(service.submit({ originalname: 'sintetica.xlsx', buffer: Buffer.from('x'), size: 1 },
      'carga_inicial', 'lote-sintetico', false)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('recusa extensão que não seja XLSX antes de executar o worker', async () => {
    const config = { get: () => ({ enabled: true, host: 'localhost', port: 5432, name: 'db', user: 'importador', password: 'synthetic', role: 'ambulatorio_importador' }) };
    const service = new ImportacoesService({} as never, config as never, {} as never);
    await expect(service.submit({ originalname: 'sintetica.csv', buffer: Buffer.from('x'), size: 1 },
      'carga_inicial', 'lote-sintetico', false)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('filtra a lista antes da paginação e nega detalhe fora do escopo numa única consulta', async () => {
    const user = { usuarioId: '42', nome: 'Consulta sintética', perfil: 'consulta' as const };
    const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    const database = { transaction: jest.fn(async (operation: (value: typeof tx) => Promise<unknown>) => operation(tx)) };
    const access = { policy: 'vinculo_explicito', requireEnabled: jest.fn(), identity: jest.fn() };
    const config = { get: (key: string) => key === 'clinical'
      ? { accessPolicy: 'vinculo_explicito' } : key === 'nodeEnv' ? 'test' : { enabled: false } };
    const service = new ImportacoesService(database as never, config as never, access as never);

    await service.list(1, 0, user);
    expect(database.transaction).toHaveBeenCalledWith(expect.any(Function), user.usuarioId);
    expect(access.identity).toHaveBeenCalledWith(tx, user);
    expect(tx.query.mock.calls[0][0]).toContain('WHERE ambulatorio.importacao_lote_pode_consultar(importacao_lote_id)');
    expect(tx.query.mock.calls[0][0]).toContain('LIMIT $1 OFFSET $2');

    tx.query.mockResolvedValueOnce({ rows: [{ autorizado: false }] });
    await expect(service.get(user, '7', 20, 0, false)).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.query).toHaveBeenCalledTimes(2);
    expect(tx.query.mock.calls[1][0]).toContain('jsonb_agg(jsonb_build_object');
    await expect(service.get(user, '999', 20, 0, false)).resolves.toBeUndefined();
    expect(tx.query).toHaveBeenCalledTimes(3);
  });
});
