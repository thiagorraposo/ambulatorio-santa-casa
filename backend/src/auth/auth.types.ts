export const PERFIS = ['consulta', 'edicao', 'administracao'] as const;
export type Perfil = (typeof PERFIS)[number];

export interface AuthenticatedUser {
  usuarioId: string;
  nome: string;
  perfil: Perfil;
}

export interface TokenPayload {
  sub: string;
  typ: 'access';
}

