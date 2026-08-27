import { validateConfig } from '../../src/config/app.config';

const valid = {
  NODE_ENV: 'test', API_PORT: '3000', APP_DB_HOST: 'localhost', APP_DB_PORT: '5432',
  APP_DB_NAME: 'db', APP_DB_USER: 'login', APP_DB_PASSWORD: 'synthetic',
  APP_DB_ROLE: 'ambulatorio_aplicacao',
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
});
