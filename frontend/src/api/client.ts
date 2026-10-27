const messages: Record<number, string> = {
  0: 'Não foi possível conectar ao serviço. Verifique sua conexão e tente novamente.',
  400: 'A solicitação não é válida. Revise os campos e filtros e tente novamente.',
  401: 'Sua sessão terminou. Entre novamente para continuar.',
  403: 'Você não tem autorização para esta operação ou recurso.',
  404: 'Registro ou página não disponível.',
  409: 'Este registro foi alterado por outra pessoa ou a operação conflita com um registro existente. Consulte o estado atual antes de continuar.',
  429: 'Muitas tentativas. Aguarde um pouco antes de tentar novamente.',
  503: 'O serviço está indisponível ou este recurso está desabilitado. Tente novamente mais tarde.',
};

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(messages[status] ?? 'Não foi possível concluir a solicitação. Tente novamente mais tarde.');
    this.name = 'ApiError';
    this.status = status;
  }
}

export const aborted = () => new DOMException('Solicitação encerrada', 'AbortError');
export const isAbort = (error: unknown): boolean => error instanceof Error && error.name === 'AbortError';
export type SessionEndReason = 'expired' | 'unauthorized' | 'signed_out';

/** Bearer credentials and in-flight requests live only in this instance. */
export class ApiClient {
  private credential: { token: string; expiresAt: number } | null = null;
  private controllers = new Set<AbortController>();
  private epoch = 0;

  constructor(
    private readonly fetcher: typeof fetch = (...args) => globalThis.fetch(...args),
    private readonly unauthorized: (reason: SessionEndReason) => void = () => undefined,
    private readonly now: () => number = Date.now,
  ) {}

  get generation(): number { return this.epoch; }

  clear(): void {
    this.credential = null;
    this.cancelPending();
  }

  cancelPending(): void {
    this.epoch++;
    for (const controller of this.controllers) controller.abort();
    this.controllers.clear();
  }

  authenticate(token: string, seconds: number): number {
    this.clear();
    if (!token || !Number.isFinite(seconds) || seconds <= 0 || seconds > 86400) throw new ApiError(502);
    const expiresAt = this.now() + seconds * 1000;
    this.credential = { token, expiresAt };
    return expiresAt;
  }

  get<T>(path: string, signal?: AbortSignal): Promise<T> {
    return this.request<T>(path, { signal });
  }

  async request<T>(path: string, options: { method?: 'GET' | 'POST' | 'PATCH' | 'PUT'; body?: unknown;
    signal?: AbortSignal; public?: boolean; operationId?: string } = {}): Promise<T> {
    // Only application-relative, versioned URLs may receive the credential.
    if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) throw new ApiError(400);
    const epoch = this.epoch;
    const credential = this.credential;
    if (!options.public && (!credential || credential.expiresAt <= this.now())) {
      this.unauthorized(credential ? 'expired' : 'unauthorized');
      throw new ApiError(401);
    }
    const controller = new AbortController();
    const cancel = () => controller.abort();
    options.signal?.addEventListener('abort', cancel, { once: true });
    if (options.signal?.aborted) controller.abort();
    this.controllers.add(controller);
    const current = () => {
      if (epoch !== this.epoch || controller.signal.aborted) throw aborted();
    };
    try {
      current();
      const headers: Record<string, string> = { Accept: 'application/json' };
      const multipart = options.body instanceof FormData;
      if (!options.public && credential) headers.Authorization = `Bearer ${credential.token}`;
      // The browser supplies the multipart boundary for FormData.
      if (options.body !== undefined && !multipart) headers['Content-Type'] = 'application/json';
      if (options.operationId) headers['X-Operacao-Id'] = options.operationId;
      const response = await this.fetcher(`/v1${path}`, {
        method: options.method ?? 'GET', headers, credentials: 'omit', cache: 'no-store',
        body: options.body === undefined ? undefined : multipart ? options.body as FormData : JSON.stringify(options.body), signal: controller.signal,
      });
      current();
      if (!response.ok) {
        if (response.status === 401 && !options.public) this.unauthorized('unauthorized');
        // Arbitrary server text, SQL errors and clinical processing details are not displayed.
        throw new ApiError(response.status);
      }
      const data: T = await response.json();
      current();
      return data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      current();
      if (isAbort(error)) throw error;
      throw new ApiError(error instanceof SyntaxError ? 502 : 0);
    } finally {
      this.controllers.delete(controller);
      options.signal?.removeEventListener('abort', cancel);
    }
  }
}
