import { HttpErrorFilter } from '../../src/common/http/http-error.filter';

describe('HttpErrorFilter', () => {
  it('sanitiza erros internos sem SQL, stack ou credenciais', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = { switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ method: 'GET', path: '/pacientes' }),
    }) } as never;
    new HttpErrorFilter().catch(new Error('SELECT segredo FROM tabela'), host);
    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith({ statusCode: 503, error: 'Service Unavailable',
      message: 'Serviço temporariamente indisponível' });
    expect(JSON.stringify(json.mock.calls)).not.toContain('SELECT segredo');
  });
});
