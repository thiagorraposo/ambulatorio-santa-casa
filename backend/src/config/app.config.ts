import { isIP } from 'node:net';

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  apiPort: number;
  apiHost: string;
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    role: 'ambulatorio_aplicacao';
  };
  auth: { jwtSecret: string; jwtExpiresInSeconds: number };
  clinical: { accessPolicy: 'desabilitada' | 'vinculo_explicito' | 'todos_sinteticos' };
  importer: { enabled: boolean; host?: string; port?: number; name?: string; user?: string; password?: string; role: 'ambulatorio_importador' };
  revisions: {
    enabled: boolean; syntheticMode: boolean; host?: string; port?: number; name?: string; user?: string; password?: string;
    role: 'ambulatorio_revisao_servico';
    stagingEnabled: boolean; executionEnabled: boolean; gitRevision?: string;
    manager: { enabled: boolean; host?: string; port?: number; name?: string; user?: string; password?: string;
      role: 'ambulatorio_revisao_gestor' };
  };
}

const required = (env: Record<string, unknown>, key: string): string => {
  const value = env[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Configuração obrigatória ausente: ${key}`);
  }
  return value;
};

const port = (env: Record<string, unknown>, key: string): number => {
  const value = Number(required(env, key));
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`Configuração inválida: ${key}`);
  }
  return value;
};

const flag = (env: Record<string, unknown>, key: string): boolean => {
  const value = env[key] ?? 'false';
  if (value !== 'true' && value !== 'false') throw new Error(`Configuração inválida: ${key}`);
  return value === 'true';
};

export function validateConfig(env: Record<string, unknown>): AppConfig {
  const apiHost = env.API_HOST ?? '0.0.0.0';
  if (typeof apiHost !== 'string' || !isIP(apiHost)) {
    throw new Error('Configuração inválida: API_HOST');
  }
  const nodeEnv = required(env, 'NODE_ENV');
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('Configuração inválida: NODE_ENV');
  }
  const role = required(env, 'APP_DB_ROLE');
  if (role !== 'ambulatorio_aplicacao') {
    throw new Error('Configuração inválida: APP_DB_ROLE');
  }
  const jwtSecret = required(env, 'AUTH_JWT_SECRET');
  if (jwtSecret.length < 32) {
    throw new Error('Configuração inválida: AUTH_JWT_SECRET');
  }
  const jwtExpiresInSeconds = Number(required(env, 'AUTH_JWT_EXPIRES_IN_SECONDS'));
  if (!Number.isInteger(jwtExpiresInSeconds) || jwtExpiresInSeconds < 60 || jwtExpiresInSeconds > 86400) {
    throw new Error('Configuração inválida: AUTH_JWT_EXPIRES_IN_SECONDS');
  }
  const accessPolicy = env.CLINICAL_ACCESS_POLICY ?? 'desabilitada';
  if (!['desabilitada', 'vinculo_explicito', 'todos_sinteticos'].includes(String(accessPolicy))
      || (nodeEnv === 'production' && accessPolicy !== 'desabilitada')) {
    throw new Error('Configuração inválida: CLINICAL_ACCESS_POLICY');
  }
  const importerEnabled = flag(env, 'CLINICAL_IMPORT_ENABLED');
  if (importerEnabled && nodeEnv === 'production') throw new Error('Configuração inválida: CLINICAL_IMPORT_ENABLED');
  const importer = importerEnabled ? {
    enabled: true,
    host: required(env, 'IMPORT_DB_HOST'), port: port(env, 'IMPORT_DB_PORT'), name: required(env, 'IMPORT_DB_NAME'),
    user: required(env, 'IMPORT_DB_USER'), password: required(env, 'IMPORT_DB_PASSWORD'), role: 'ambulatorio_importador' as const,
  } : { enabled: false, role: 'ambulatorio_importador' as const };
  const revisionsEnabled = flag(env, 'REVISION_HTTP_ENABLED');
  const revisionSyntheticMode = flag(env, 'REVISION_SYNTHETIC_MODE');
  if (revisionsEnabled && (nodeEnv === 'production' || !revisionSyntheticMode)) {
    throw new Error('Configuração inválida: revisão HTTP exige ambiente sintético fora de produção');
  }
  const revisionManagerEnabled = flag(env, 'REVISION_MANAGER_HTTP_ENABLED');
  if (revisionManagerEnabled && (!revisionsEnabled || nodeEnv === 'production' || !revisionSyntheticMode)) {
    throw new Error('Configuração inválida: gestão de revisão exige revisão sintética habilitada fora de produção');
  }
  const revisionStagingEnabled = flag(env, 'REVISION_STAGING_HTTP_ENABLED');
  if (revisionStagingEnabled && !revisionsEnabled) {
    throw new Error('Configuração inválida: staging exige revisão sintética habilitada');
  }
  const revisionGit = revisionStagingEnabled ? required(env, 'REVISION_GIT') : undefined;
  if (revisionGit && !/^[0-9a-f]{7,40}$/.test(revisionGit)) {
    throw new Error('Configuração inválida: REVISION_GIT');
  }
  const revisionExecutionEnabled = flag(env, 'REVISION_EXECUTION_HTTP_ENABLED');
  if (revisionExecutionEnabled && (!['test', 'development'].includes(nodeEnv)
      || !revisionSyntheticMode || !revisionStagingEnabled)) {
    throw new Error('Configuração inválida: execução de revisão exige ambiente sintético e staging habilitado fora de produção');
  }
  const revisions = revisionsEnabled ? {
    enabled: true, syntheticMode: revisionSyntheticMode,
    stagingEnabled: revisionStagingEnabled, executionEnabled: revisionExecutionEnabled, gitRevision: revisionGit,
    host: required(env, 'REVISION_DB_HOST'), port: port(env, 'REVISION_DB_PORT'), name: required(env, 'REVISION_DB_NAME'),
    user: required(env, 'REVISION_DB_USER'), password: required(env, 'REVISION_DB_PASSWORD'), role: 'ambulatorio_revisao_servico' as const,
    manager: revisionManagerEnabled ? { enabled: true, host: required(env, 'REVISION_MANAGER_DB_HOST'),
      port: port(env, 'REVISION_MANAGER_DB_PORT'), name: required(env, 'REVISION_MANAGER_DB_NAME'),
      user: required(env, 'REVISION_MANAGER_DB_USER'), password: required(env, 'REVISION_MANAGER_DB_PASSWORD'),
      role: 'ambulatorio_revisao_gestor' as const } : { enabled: false, role: 'ambulatorio_revisao_gestor' as const },
  } : { enabled: false, syntheticMode: revisionSyntheticMode, role: 'ambulatorio_revisao_servico' as const,
    stagingEnabled: false, executionEnabled: false,
    manager: { enabled: false, role: 'ambulatorio_revisao_gestor' as const } };
  return {
    nodeEnv: nodeEnv as AppConfig['nodeEnv'],
    apiPort: port(env, 'API_PORT'),
    apiHost,
    database: {
      host: required(env, 'APP_DB_HOST'),
      port: port(env, 'APP_DB_PORT'),
      name: required(env, 'APP_DB_NAME'),
      user: required(env, 'APP_DB_USER'),
      password: required(env, 'APP_DB_PASSWORD'),
      role,
    },
    auth: { jwtSecret, jwtExpiresInSeconds },
    clinical: { accessPolicy: accessPolicy as AppConfig['clinical']['accessPolicy'] },
    importer,
    revisions,
  };
}
