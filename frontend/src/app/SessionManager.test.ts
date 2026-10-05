import { afterEach, describe, expect, it, vi } from 'vitest';
import { SessionManager } from './SessionManager';
import type { AuthUser } from '../api/contracts';

const user: AuthUser = { usuarioId: '9007199254740997', nome: 'Usuário Sintético', perfil: 'consulta' };
const token = () => Response.json({ accessToken: 'token-opaco-sintetico', tokenType: 'Bearer', expiresIn: 60 });
const managers: SessionManager[] = [];
function manager(fetcher: typeof fetch) {
  const instance = new SessionManager(fetcher);
  managers.push(instance);
  return instance;
}
afterEach(() => { managers.splice(0).forEach(instance => instance.dispose()); vi.useRealTimers(); });

describe('sessão em memória e cache clínico', () => {
  it('obtém identidade por /auth/me e limpa todo cache ao sair', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(token()).mockResolvedValueOnce(Response.json(user));
    const session = manager(fetcher);
    await session.login('sintetico@example.invalid', 'senha-sintetica');
    expect(session.getSnapshot()).toMatchObject({ status: 'authenticated', user });
    expect(fetcher.mock.calls.map(call => call[0])).toEqual(['/v1/auth/login', '/v1/auth/me']);
    session.queries.setQueryData(['clinical', 'paciente'], { nome: 'Paciente Sintético' });
    session.logout();
    expect(session.getSnapshot()).toMatchObject({ status: 'anonymous', user: null, reason: 'signed_out' });
    expect(session.queries.getQueryCache().getAll()).toHaveLength(0);
    await expect(session.client.get('/pacientes')).rejects.toMatchObject({ status: 401 });
  });

  it('expira pelo expiresIn retornado e remove identidade e cache', async () => {
    vi.useFakeTimers();
    const session = manager(vi.fn<typeof fetch>().mockResolvedValueOnce(token()).mockResolvedValueOnce(Response.json(user)));
    await session.login('sintetico', 'senha-sintetica');
    session.queries.setQueryData(['clinical', 'paciente'], { nome: 'Paciente Sintético' });
    await vi.advanceTimersByTimeAsync(60000);
    expect(session.getSnapshot()).toMatchObject({ status: 'anonymous', user: null, reason: 'expired' });
    expect(session.queries.getQueryCache().getAll()).toHaveLength(0);
  });

  it('401 em leitura protegida encerra imediatamente sessão e cache', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(token()).mockResolvedValueOnce(Response.json(user))
      .mockResolvedValueOnce(Response.json({}, { status: 401 }));
    const session = manager(fetcher);
    await session.login('sintetico', 'senha-sintetica');
    session.queries.setQueryData(['clinical', 'paciente'], { nome: 'Paciente Sintético' });
    await expect(session.client.get('/pacientes')).rejects.toMatchObject({ status: 401 });
    expect(session.getSnapshot()).toMatchObject({ status: 'anonymous', user: null, reason: 'unauthorized' });
    expect(session.queries.getQueryCache().getAll()).toHaveLength(0);
  });

  it('resposta de login encerrado não reabre sessão', async () => {
    let release!: (response: Response) => void;
    const fetcher = vi.fn<typeof fetch>().mockReturnValue(new Promise(resolve => { release = resolve; }));
    const session = manager(fetcher);
    const login = session.login('sintetico', 'senha-sintetica');
    session.logout();
    release(token());
    await expect(login).rejects.toMatchObject({ name: 'AbortError' });
    expect(session.getSnapshot().status).toBe('anonymous');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('novo login limpa dados anteriores e usa a identidade efetiva do servidor', async () => {
    const other: AuthUser = { usuarioId: '42', nome: 'Outro Sintético', perfil: 'edicao' };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(token()).mockResolvedValueOnce(Response.json(user))
      .mockResolvedValueOnce(token()).mockResolvedValueOnce(Response.json(other));
    const session = manager(fetcher);
    await session.login('sintetico', 'senha-sintetica');
    session.queries.setQueryData(['clinical', 'paciente'], { nome: 'Paciente Sintético' });
    const previous = session.getSnapshot().generation;
    await session.login('outro-sintetico', 'senha-sintetica');
    expect(session.getSnapshot().user).toEqual(other);
    expect(session.getSnapshot().generation).toBeGreaterThan(previous);
    expect(session.queries.getQueryCache().getAll()).toHaveLength(0);
  });

  it('revalida identidade na retomada e limpa dados se o perfil mudar', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(token()).mockResolvedValueOnce(Response.json(user))
      .mockResolvedValueOnce(Response.json({ ...user, perfil: 'edicao' }));
    const session = manager(fetcher);
    await session.login('sintetico', 'senha-sintetica');
    session.queries.setQueryData(['clinical', 'paciente'], { nome: 'Paciente Sintético' });
    const previous = session.getSnapshot().generation;
    await session.revalidate();
    expect(session.getSnapshot().user?.perfil).toBe('edicao');
    expect(session.getSnapshot().generation).toBeGreaterThan(previous);
    expect(session.queries.getQueryCache().getAll()).toHaveLength(0);
  });

  it('falha na revalidação remove cache e impede a leitura da identidade antiga', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(token()).mockResolvedValueOnce(Response.json(user))
      .mockResolvedValueOnce(Response.json({}, { status: 503 })).mockResolvedValueOnce(Response.json(user));
    const session = manager(fetcher);
    await session.login('sintetico', 'senha-sintetica');
    session.queries.setQueryData(['clinical', 'paciente'], { nome: 'Paciente Sintético' });
    await session.revalidate();
    expect(session.getSnapshot().identityError?.status).toBe(503);
    expect(session.queries.getQueryCache().getAll()).toHaveLength(0);
    await session.revalidate();
    expect(session.getSnapshot().identityError).toBeNull();
    expect(session.getSnapshot().user).toEqual(user);
  });

  it('recusa identidade fora do contrato sem conceder sessão', async () => {
    const session = manager(vi.fn<typeof fetch>().mockResolvedValueOnce(token())
      .mockResolvedValueOnce(Response.json({ ...user, perfil: 'superusuario' })));
    await expect(session.login('sintetico', 'senha-sintetica')).rejects.toMatchObject({ status: 502 });
    expect(session.getSnapshot()).toMatchObject({ status: 'anonymous', user: null });
  });
});
