export const PERFIS = ['consulta', 'edicao', 'administracao'] as const;
export type Perfil = (typeof PERFIS)[number];

export const SESSION_VERSION = Symbol('sessionVersion');

export interface AuthenticatedUser {
  [SESSION_VERSION]?: string;
  usuarioId: string;
  nome: string;
  perfil: Perfil;
  login?: string;
  ativo?: boolean;
  trocaObrigatoria?: boolean;
}

export interface TokenPayload {
  sub: string;
  typ: 'access';
  ver?: string;
}

