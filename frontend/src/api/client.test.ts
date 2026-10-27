import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiError } from './client';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

describe('cliente HTTP /v1', () => {
  it('envia FormData intacto sem Content-Type e preserva o envio JSON', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({ ok: true }));
    const client = new ApiClient(fetcher);
    client.authenticate('token-sintetico', 60);
    const body = new FormData();
    body.append('arquivo', new File(['sintético'], 'sintetico.xlsx'));
    body.append('dryRun', 'true');
    await client.request('/importacoes', { method: 'POST', body });
    const multipart = fetcher.mock.calls[0]![1]!;
    expect(multipart.body).toBe(body);
    expect(multipart.headers).toEqual({ Accept: 'application/json', Authorization: 'Bearer token-sintetico' });
    expect(multipart).toMatchObject({ cache: 'no-store', credentials: 'omit' });
    await client.request('/pacientes', { method: 'POST', body: { nome: 'Sintético' } });
    expect(fetcher.mock.calls[1]![1]).toMatchObject({ body: JSON.stringify({ nome: 'Sintético' }),
      headers: { 'Content-Type': 'application/json' } });
  });

  it('descarta multipart atrasado após abort e troca de identidade', async () => {
    const late = deferred<Response>();
    const fetcher = vi.fn<typeof fetch>().mockReturnValue(late.promise);
    const client = new ApiClient(fetcher);
    client.authenticate('anterior', 60);
    const controller = new AbortController();
    const result = client.request('/importacoes', { method: 'POST', body: new FormData(), signal: controller.signal });
    controller.abort();
    client.authenticate('atual', 60);
    expect(fetcher.mock.calls[0]![1]!.signal!.aborted).toBe(true);
    late.resolve(Response.json({ dryRun: true }));
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  });
  it('envia Bearer apenas pela rota local versionada, sem cache HTTP ou cookies', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json([{ pacienteId: '9007199254740997', nome: 'Sintético' }]));
    const client = new ApiClient(fetcher);
    client.authenticate('token-sintetico', 60);
    expect(await client.get('/pacientes?limit=1')).toEqual([{ pacienteId: '9007199254740997', nome: 'Sintético' }]);
    expect(fetcher).toHaveBeenCalledWith('/v1/pacientes?limit=1', expect.objectContaining({
      cache: 'no-store', credentials: 'omit', headers: expect.objectContaining({ Authorization: 'Bearer token-sintetico' }),
    }));
    await expect(client.get('https://example.invalid/pacientes')).rejects.toMatchObject({ status: 400 });
    await expect(client.get('//example.invalid/pacientes')).rejects.toMatchObject({ status: 400 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('descarta resposta clínica atrasada após troca de sessão mesmo se fetch ignora abort', async () => {
    const late = deferred<Response>();
    const fetcher = vi.fn<typeof fetch>().mockReturnValueOnce(late.promise).mockResolvedValueOnce(Response.json([]));
    const client = new ApiClient(fetcher);
    client.authenticate('sessao-anterior-sintetica', 60);
    const result = client.get('/pacientes');
    const signal = fetcher.mock.calls[0]![1]!.signal!;
    client.clear();
    client.authenticate('sessao-nova-sintetica', 60);
    expect(signal.aborted).toBe(true);
    late.resolve(Response.json([{ nome: 'Dado da identidade anterior' }]));
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    expect(await client.get('/pacientes')).toEqual([]);
  });

  it('401 de requisição anterior não encerra a nova identidade', async () => {
    const late = deferred<Response>();
    const unauthorized = vi.fn();
    const client = new ApiClient(vi.fn<typeof fetch>().mockReturnValue(late.promise), unauthorized);
    client.authenticate('token-anterior', 60);
    const result = client.get('/pacientes');
    client.authenticate('token-atual', 60);
    late.resolve(Response.json({ message: 'recusa sintética' }, { status: 401 }));
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    expect(unauthorized).not.toHaveBeenCalled();
  });

  it('cancelamento de leitura impede resposta recebida após sair da rota', async () => {
    const late = deferred<Response>();
    const client = new ApiClient(vi.fn<typeof fetch>().mockReturnValue(late.promise));
    client.authenticate('token-sintetico', 60);
    const controller = new AbortController();
    const result = client.get('/pacientes/1', controller.signal);
    controller.abort();
    late.resolve(Response.json({ nome: 'Resposta obsoleta sintética' }));
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('rejeita expiração local antes de enviar uma nova leitura', async () => {
    let now = 0;
    const fetcher = vi.fn<typeof fetch>();
    const unauthorized = vi.fn();
    const client = new ApiClient(fetcher, unauthorized, () => now);
    client.authenticate('token-sintetico', 60);
    now = 60001;
    await expect(client.get('/pacientes')).rejects.toMatchObject({ status: 401 });
    expect(unauthorized).toHaveBeenCalledWith('expired');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('login público malsucedido não dispara encerramento de sessão protegida', async () => {
    const unauthorized = vi.fn();
    const client = new ApiClient(vi.fn<typeof fetch>().mockResolvedValue(Response.json({}, { status: 401 })), unauthorized);
    await expect(client.request('/auth/login', { method: 'POST', public: true,
      body: { login: 'sintetico', senha: 'senha-sintetica' } })).rejects.toMatchObject({ status: 401 });
    expect(unauthorized).not.toHaveBeenCalled();
  });

  it.each([400, 403, 404, 429, 503, 500])('sanitiza HTTP %i sem expor mensagem bruta', async status => {
    const client = new ApiClient(vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ message: 'SQL: texto clínico sintético bruto' }, { status }),
    ));
    client.authenticate('token-sintetico', 60);
    const error = await client.get('/pacientes').catch((value: unknown) => value);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status });
    expect((error as ApiError).message).not.toContain('SQL');
    expect((error as ApiError).message).not.toContain('clínico');
  });

  it('distingue indisponibilidade de rede e resposta JSON inválida', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(new Response('<html>erro técnico</html>'));
    const client = new ApiClient(fetcher);
    client.authenticate('token-sintetico', 60);
    await expect(client.get('/pacientes')).rejects.toMatchObject({ status: 0 });
    await expect(client.get('/pacientes')).rejects.toMatchObject({ status: 502 });
  });
});
