import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { SessionManager } from '../app/SessionManager';
import { SessionProvider } from '../app/session';
import { useApiQuery } from '../api/useApiQuery';
import { EmptyState, QueryState } from './ui';

const sessions: SessionManager[] = [];
afterEach(() => sessions.splice(0).forEach(session => session.dispose()));
function Reader() {
  const query = useApiQuery<Array<{ nome: string }>>('/pacientes');
  return <QueryState query={query}>{data => data.length ? <p>{data[0]!.nome}</p>
    : <EmptyState>Nenhum paciente nesta página.</EmptyState>}</QueryState>;
}
async function setup(fetcher: typeof fetch) {
  const session = new SessionManager(fetcher);
  sessions.push(session);
  await session.login('sintetico', 'senha-sintetica');
  render(<SessionProvider manager={session}><Reader /></SessionProvider>);
  return session;
}
const authentication = (fetcher: ReturnType<typeof vi.fn<typeof fetch>>) => fetcher
  .mockResolvedValueOnce(Response.json({ accessToken: 'sintetico', tokenType: 'Bearer', expiresIn: 60 }))
  .mockResolvedValueOnce(Response.json({ usuarioId: '1', nome: 'Usuário sintético', perfil: 'consulta' }));

describe('consulta e retomada de acesso', () => {
  it('exibe carregamento inicial e diferencia página vazia', async () => {
    let release!: (response: Response) => void;
    const fetcher = authentication(vi.fn<typeof fetch>())
      .mockReturnValueOnce(new Promise(resolve => { release = resolve; }));
    await setup(fetcher);
    expect(screen.getByRole('status')).toHaveTextContent('Carregando');
    await act(async () => release(Response.json([])));
    expect(await screen.findByText('Nenhum paciente nesta página.')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('retomar identidade igual reconsulta recurso e oculta dados após vínculo revogado', async () => {
    const fetcher = authentication(vi.fn<typeof fetch>())
      .mockResolvedValueOnce(Response.json([{ nome: 'Paciente com vínculo sintético' }]))
      .mockResolvedValueOnce(Response.json({ usuarioId: '1', nome: 'Usuário sintético', perfil: 'consulta' }))
      .mockResolvedValueOnce(Response.json({}, { status: 403 }));
    const session = await setup(fetcher);
    expect(await screen.findByText('Paciente com vínculo sintético')).toBeVisible();
    await act(async () => session.revalidate());
    expect(await screen.findByRole('alert')).toHaveTextContent('Acesso não autorizado');
    expect(screen.queryByText('Paciente com vínculo sintético')).not.toBeInTheDocument();
    expect(fetcher.mock.calls.filter(call => call[0] === '/v1/pacientes')).toHaveLength(2);
    expect(session.getSnapshot().status).toBe('authenticated');
  });

  it('não mantém dados antigos durante reconsulta pendente ou após falha de rede', async () => {
    let reject!: (error: Error) => void;
    const fetcher = authentication(vi.fn<typeof fetch>())
      .mockResolvedValueOnce(Response.json([{ nome: 'Paciente sintético anterior' }]))
      .mockReturnValueOnce(new Promise((_resolve, fail) => { reject = fail; }));
    const session = await setup(fetcher);
    expect(await screen.findByText('Paciente sintético anterior')).toBeVisible();
    let refresh!: Promise<void>;
    act(() => { refresh = session.queries.refetchQueries({ queryKey: ['clinical'] }); });
    expect(await screen.findByText('Carregando…')).toBeVisible();
    expect(screen.queryByText('Paciente sintético anterior')).not.toBeInTheDocument();
    await act(async () => { reject(new TypeError('fetch failed')); await refresh; });
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível conectar');
    expect(screen.queryByText('Paciente sintético anterior')).not.toBeInTheDocument();
  });
});
