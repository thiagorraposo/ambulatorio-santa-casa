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

  it('mantém importação HTTP desabilitada por padrão e exige role separada ao habilitar', () => {
    expect(validateConfig(valid).importer.enabled).toBe(false);
    const importer = validateConfig({ ...valid, NODE_ENV: 'development', CLINICAL_IMPORT_ENABLED: 'true',
      IMPORT_DB_HOST: 'localhost', IMPORT_DB_PORT: '5432', IMPORT_DB_NAME: 'db',
      IMPORT_DB_USER: 'importador', IMPORT_DB_PASSWORD: 'synthetic-importer' });
    expect(importer.importer).toMatchObject({ enabled: true, role: 'ambulatorio_importador' });
    expect(() => validateConfig({ ...valid, NODE_ENV: 'production', CLINICAL_IMPORT_ENABLED: 'true',
      IMPORT_DB_HOST: 'localhost', IMPORT_DB_PORT: '5432', IMPORT_DB_NAME: 'db',
      IMPORT_DB_USER: 'importador', IMPORT_DB_PASSWORD: 'synthetic-importer' })).toThrow('CLINICAL_IMPORT_ENABLED');
  });
});
