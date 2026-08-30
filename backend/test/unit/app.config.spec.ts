import { validateConfig } from '../../src/config/app.config';

const valid = {
  NODE_ENV: 'test', API_PORT: '3000', APP_DB_HOST: 'localhost', APP_DB_PORT: '5432',
  APP_DB_NAME: 'db', APP_DB_USER: 'login', APP_DB_PASSWORD: 'synthetic',
  APP_DB_ROLE: 'ambulatorio_aplicacao',
  AUTH_JWT_SECRET: 'segredo-sintetico-com-mais-de-trinta-e-dois-caracteres',
  AUTH_JWT_EXPIRES_IN_SECONDS: '900',
};

describe('validateConfig', () => {
  it('falha de forma controlada quando configuração obrigatória está ausente', () => {
    const { APP_DB_PASSWORD: _, ...missing } = valid;
    expect(() => validateConfig(missing)).toThrow('Configuração obrigatória ausente: APP_DB_PASSWORD');
  });

  it('recusa role diferente da role limitada da aplicação', () => {
    expect(() => validateConfig({ ...valid, APP_DB_ROLE: 'ambulatorio_user' }))
      .toThrow('Configuração inválida: APP_DB_ROLE');
  });

  it('falha de forma controlada sem secret de autenticação', () => {
    const { AUTH_JWT_SECRET: _, ...missing } = valid;
    expect(() => validateConfig(missing)).toThrow('Configuração obrigatória ausente: AUTH_JWT_SECRET');
  });

  it('recusa secret curto e expiração fora do intervalo seguro', () => {
    expect(() => validateConfig({ ...valid, AUTH_JWT_SECRET: 'curto' }))
      .toThrow('Configuração inválida: AUTH_JWT_SECRET');
    expect(() => validateConfig({ ...valid, AUTH_JWT_EXPIRES_IN_SECONDS: '0' }))
      .toThrow('Configuração inválida: AUTH_JWT_EXPIRES_IN_SECONDS');
  });
});
