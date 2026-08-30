export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  apiPort: number;
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    role: 'ambulatorio_aplicacao';
  };
  auth: { jwtSecret: string; jwtExpiresInSeconds: number };
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

export function validateConfig(env: Record<string, unknown>): AppConfig {
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
  return {
    nodeEnv: nodeEnv as AppConfig['nodeEnv'],
    apiPort: port(env, 'API_PORT'),
    database: {
      host: required(env, 'APP_DB_HOST'),
      port: port(env, 'APP_DB_PORT'),
      name: required(env, 'APP_DB_NAME'),
      user: required(env, 'APP_DB_USER'),
      password: required(env, 'APP_DB_PASSWORD'),
      role,
    },
    auth: { jwtSecret, jwtExpiresInSeconds },
  };
}
