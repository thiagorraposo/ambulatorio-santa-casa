import { ServiceUnavailableException, BadRequestException } from '@nestjs/common';
import { ImportacoesService } from '../../src/importacoes/importacoes.service';

describe('ImportacoesService', () => {
  it('mantém o upload desabilitado sem configuração explícita', async () => {
    const service = new ImportacoesService({} as never, { get: () => ({ enabled: false }) } as never);
    await expect(service.submit({ originalname: 'sintetica.xlsx', buffer: Buffer.from('x'), size: 1 },
      'carga_inicial', 'lote-sintetico', false)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('recusa extensão que não seja XLSX antes de executar o worker', async () => {
    const config = { get: () => ({ enabled: true, host: 'localhost', port: 5432, name: 'db', user: 'importador', password: 'synthetic', role: 'ambulatorio_importador' }) };
    const service = new ImportacoesService({} as never, config as never);
    await expect(service.submit({ originalname: 'sintetica.csv', buffer: Buffer.from('x'), size: 1 },
      'carga_inicial', 'lote-sintetico', false)).rejects.toBeInstanceOf(BadRequestException);
  });
});
