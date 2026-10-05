import { QueryClient } from '@tanstack/react-query';
import type { AuthUser, LoginResponse } from '../api/contracts';
import { aborted, ApiClient, ApiError, type SessionEndReason } from '../api/client';

export interface SessionSnapshot {
  status: 'anonymous' | 'authenticating' | 'authenticated';
  user: AuthUser | null;
  generation: number;
  reason: SessionEndReason | null;
  identityError: ApiError | null;
}

function identity(value: AuthUser): AuthUser {
  if (!value || typeof value.usuarioId !== 'string' || !/^\d+$/.test(value.usuarioId)
    || typeof value.nome !== 'string' || !['consulta', 'edicao', 'administracao'].includes(value.perfil)) {
    throw new ApiError(502);
  }
  return { usuarioId: value.usuarioId, nome: value.nome, perfil: value.perfil };
}

export class SessionManager {
  readonly client: ApiClient;
  readonly queries: QueryClient;
  private listeners = new Set<() => void>();
  private intent = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private expiresAt = 0;
  private validating: Promise<void> | undefined;
  private state: SessionSnapshot = {
    status: 'anonymous', user: null, generation: 0, reason: null, identityError: null,
  };

  constructor(fetcher?: typeof fetch) {
    this.queries = new QueryClient({ defaultOptions: { queries: {
      retry: false, staleTime: 0, gcTime: 0,
      refetchOnWindowFocus: 'always', refetchOnMount: 'always', refetchOnReconnect: 'always',
    } } });
    this.client = new ApiClient(fetcher, (reason) => this.end(reason));
  }

  getSnapshot = (): SessionSnapshot => this.state;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private publish(next: Omit<SessionSnapshot, 'generation'>): void {
    this.state = { ...next, generation: this.client.generation };
    for (const listener of this.listeners) listener();
  }

  private clearQueries(): void {
    void this.queries.cancelQueries();
    this.queries.clear();
  }

  private end(reason: SessionEndReason | null): void {
    this.intent++;
    clearTimeout(this.timer);
    this.expiresAt = 0;
    this.validating = undefined;
    this.client.clear();
    this.clearQueries();
    this.publish({ status: 'anonymous', user: null, reason, identityError: null });
  }

  login = async (login: string, senha: string): Promise<void> => {
    this.end(null);
    const intent = this.intent;
    this.publish({ status: 'authenticating', user: null, reason: null, identityError: null });
    try {
      const token = await this.client.request<LoginResponse>('/auth/login', {
        method: 'POST', body: { login, senha }, public: true,
      });
      if (intent !== this.intent) throw aborted();
      if (token.tokenType !== 'Bearer') throw new ApiError(502);
      this.expiresAt = this.client.authenticate(token.accessToken, token.expiresIn);
      this.timer = setTimeout(() => this.end('expired'), Math.max(0, this.expiresAt - Date.now()));
      const user = identity(await this.client.get<AuthUser>('/auth/me'));
      if (intent !== this.intent) throw aborted();
      this.publish({ status: 'authenticated', user, reason: null, identityError: null });
    } catch (error) {
      if (intent === this.intent) this.end(null);
      throw error;
    }
  };

  logout = (): void => this.end('signed_out');

  revalidate = (): Promise<void> => {
    if (this.state.status !== 'authenticated') return Promise.resolve();
    if (Date.now() >= this.expiresAt) {
      this.end('expired');
      return Promise.resolve();
    }
    if (this.validating) return this.validating;
    const intent = this.intent;
    const operation = (async () => {
      try {
        const user = identity(await this.client.get<AuthUser>('/auth/me'));
        if (intent !== this.intent) return;
        const changed = user.usuarioId !== this.state.user?.usuarioId || user.perfil !== this.state.user?.perfil;
        if (changed) {
          this.client.cancelPending();
          this.clearQueries();
        }
        this.publish({ status: 'authenticated', user, reason: null, identityError: null });
        // Identity can remain unchanged while patient access has been revoked.
        // Window focus alone is not a TanStack visibility event, so refresh the
        // mounted clinical resources explicitly when resuming the session.
        if (!changed) await this.queries.invalidateQueries({ queryKey: ['clinical'], refetchType: 'active' });
      } catch (error) {
        if (intent !== this.intent) return;
        this.client.cancelPending();
        this.clearQueries();
        this.publish({ status: 'authenticated', user: this.state.user, reason: null,
          identityError: error instanceof ApiError ? error : new ApiError(0) });
      }
    })();
    this.validating = operation;
    void operation.finally(() => { if (this.validating === operation) this.validating = undefined; });
    return operation;
  };

  dispose = (): void => {
    this.end(null);
    this.listeners.clear();
  };
}
