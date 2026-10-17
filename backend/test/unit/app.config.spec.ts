import { validateConfig } from '../../src/config/app.config';

const valid = {
  NODE_ENV: 'test', API_PORT: '3000', APP_DB_HOST: 'localhost', APP_DB_PORT: '5432',
  APP_DB_NAME: 'db', APP_DB_USER: 'login', APP_DB_PASSWORD: 'synthetic',
  APP_DB_ROLE: 'ambulatorio_aplicacao',
  AUTH_JWT_SECRET: 'segredo-sintetico-com-mais-de-trinta-e-dois-caracteres',
  AUTH_JWT_EXPIRES_IN_SECONDS: '900',
};

describe('validateConfig', () => {
  it('permite bind explícito IPv4/IPv6 e preserva o padrão, recusando host inválido', () => {
    expect(validateConfig(valid).apiHost).toBe('0.0.0.0');
    for (const API_HOST of ['127.0.0.1', '::1']) {
      expect(validateConfig({ ...valid, API_HOST }).apiHost).toBe(API_HOST);
    }
    for (const API_HOST of ['', 'http://127.0.0.1', '127.0.0.999', ' localhost ', 123]) {
      expect(() => validateConfig({ ...valid, API_HOST })).toThrow('Configuração inválida: API_HOST');
    }
  });

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

  it('mantém gestão temporal desligada por padrão e exige pools distintos em modo sintético', () => {
    expect(validateConfig(valid).revisions.manager.enabled).toBe(false);
    expect(() => validateConfig({ ...valid, REVISION_MANAGER_HTTP_ENABLED: 'true' }))
      .toThrow('gestão de revisão exige revisão sintética habilitada');
    const config = validateConfig({ ...valid, REVISION_HTTP_ENABLED: 'true', REVISION_SYNTHETIC_MODE: 'true',
      REVISION_DB_HOST: 'localhost', REVISION_DB_PORT: '5432', REVISION_DB_NAME: 'db',
      REVISION_DB_USER: 'revision_service', REVISION_DB_PASSWORD: 'synthetic-service',
      REVISION_MANAGER_HTTP_ENABLED: 'true', REVISION_MANAGER_DB_HOST: 'localhost', REVISION_MANAGER_DB_PORT: '5432',
      REVISION_MANAGER_DB_NAME: 'db', REVISION_MANAGER_DB_USER: 'revision_manager',
      REVISION_MANAGER_DB_PASSWORD: 'synthetic-manager' });
    expect(config.revisions).toMatchObject({ enabled: true, manager: { enabled: true, role: 'ambulatorio_revisao_gestor' } });
    expect(() => validateConfig({ ...valid, NODE_ENV: 'production', REVISION_HTTP_ENABLED: 'true',
      REVISION_SYNTHETIC_MODE: 'true', REVISION_MANAGER_HTTP_ENABLED: 'true' }))
      .toThrow('revisão HTTP exige ambiente sintético fora de produção');
  });

  it('exige ativação sintética e revisão Git explícitas para staging', () => {
    expect(validateConfig(valid).revisions.stagingEnabled).toBe(false);
    expect(validateConfig(valid).revisions.executionEnabled).toBe(false);
    expect(() => validateConfig({ ...valid, REVISION_STAGING_HTTP_ENABLED: 'true' }))
      .toThrow('staging exige revisão sintética habilitada');
    const revision = { ...valid, REVISION_HTTP_ENABLED: 'true', REVISION_SYNTHETIC_MODE: 'true',
      REVISION_DB_HOST: 'localhost', REVISION_DB_PORT: '5432', REVISION_DB_NAME: 'db',
      REVISION_DB_USER: 'revision_service', REVISION_DB_PASSWORD: 'synthetic-service',
      REVISION_STAGING_HTTP_ENABLED: 'true' };
    expect(() => validateConfig(revision)).toThrow('REVISION_GIT');
    expect(() => validateConfig({ ...revision, REVISION_GIT: 'versão desconhecida' })).toThrow('REVISION_GIT');
    expect(validateConfig({ ...revision, REVISION_GIT: 'abcdef0' }).revisions)
      .toMatchObject({ stagingEnabled: true, gitRevision: 'abcdef0' });
    const development = { ...revision, NODE_ENV: 'development', REVISION_GIT: 'abcdef0',
      REVISION_EXECUTION_HTTP_ENABLED: 'true' };
    expect(validateConfig(development).revisions)
      .toMatchObject({ executionEnabled: true, syntheticMode: true, stagingEnabled: true });
    expect(() => validateConfig({ ...development, REVISION_SYNTHETIC_MODE: 'false' }))
      .toThrow('revisão HTTP exige ambiente sintético');
    expect(() => validateConfig({ ...development, REVISION_STAGING_HTTP_ENABLED: 'false' }))
      .toThrow('ambiente sintético e staging habilitado');
    expect(() => validateConfig({ ...development, NODE_ENV: 'production' })).toThrow();
    expect(validateConfig({ ...revision, REVISION_GIT: 'abcdef0', REVISION_EXECUTION_HTTP_ENABLED: 'true' }).revisions)
      .toMatchObject({ executionEnabled: true });
  });
});
