import { Logger } from '@nestjs/common';
import { RequestLoggerMiddleware } from '../../src/common/http/request-logger.middleware';

describe('RequestLoggerMiddleware', () => {
  it('registra apenas allowlist técnica e identidade, sem credenciais', () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    let finish: (() => void) | undefined;
    const request = { method: 'POST', path: '/auth/login', body: { senha: 'segredo',
      senha_hash: '$2b$hash', token: 'jwt' }, headers: { authorization: 'Bearer jwt' },
      user: { usuarioId: '42', nome: 'Nome não deve ir ao log', perfil: 'consulta' } };
    const response = { statusCode: 200, on: (_event: string, callback: () => void) => { finish = callback; } };
    new RequestLoggerMiddleware().use(request as never, response as never, jest.fn());
    finish?.();
    const serialized = String(log.mock.calls[0][0]);
    expect(serialized).toContain('"userId":"42"');
    expect(serialized).toContain('"perfil":"consulta"');
    expect(serialized).not.toMatch(/segredo|senha_hash|Bearer|jwt|Nome não deve/);
    log.mockRestore();
  });
});
