import { BadRequestException } from '@nestjs/common';
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

it('publica somente caminhos/códigos conhecidos no envelope 400', () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = { switchToHttp: () => ({ getResponse: () => ({ status }), getRequest: () => ({}) }) } as never;
  new HttpErrorFilter().catch(new BadRequestException({ message: 'Revise os campos informados.', errors: [
    { path: 'dadosClinicos.pesoKg', code: 'number', value: 'segredo' },
    { path: 'segredo', code: 'invalid' }, { path: 'observacoes', code: 'SQL privado' },
  ] }), host);
  expect(json).toHaveBeenCalledWith({ statusCode: 400, error: 'BadRequestException', message: 'Revise os campos informados.',
    errors: [{ path: 'dadosClinicos.pesoKg', code: 'number' }] });
});
