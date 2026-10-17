import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { SessionManager } from '../app/SessionManager';
import { SessionProvider, useSession } from '../app/session';
import { ApiErrorState } from './ui';
import { DraftProvider, MutationForm, useClinicalDraft } from './writing';
import { withRegisteredOperations } from '../test/operation-fixture';

const managers: SessionManager[] = [];
const routers: ReturnType<typeof createMemoryRouter>[] = [];
afterEach(() => {
  routers.splice(0).forEach(router => router.dispose());
  managers.splice(0).forEach(manager => manager.dispose());
});

function SyntheticForm({ onSaved }: { onSaved?: (data: unknown) => void }) {
  const [draft, setDraft] = useClinicalDraft('refresh-regression:draft', { nome: '' });
  return <MutationForm title="Registro sintético" path="/regression-write" method="POST"
    dirty={draft.nome !== ''} buildBody={() => draft} onSaved={onSaved}>
    <label htmlFor="synthetic-draft">Nome sintético</label>
    <input id="synthetic-draft" value={draft.nome} onChange={event => setDraft({ nome: event.target.value })} />
  </MutationForm>;
}

function RefreshFixture({ onSaved }: { onSaved?: (data: unknown) => void }) {
  const [mounted, setMounted] = useState(true);
  return <>
    <button type="button" onClick={() => setMounted(!mounted)}>
      {mounted ? 'Ocultar durante reconsulta' : 'Reabrir após reconsulta'}
    </button>
    {mounted && <SyntheticForm onSaved={onSaved} />}
  </>;
}

function AuthenticatedDrafts({ onSaved }: { onSaved?: (data: unknown) => void }) {
  const session = useSession();
  if (session.status !== 'authenticated') return <p>Sem sessão autenticada.</p>;
  return <DraftProvider key={session.draftScope}>
    {session.identityError ? <ApiErrorState error={session.identityError} /> : <RefreshFixture onSaved={onSaved} />}
  </DraftProvider>;
}

const identity = { usuarioId: '1', nome: 'Profissional sintético', perfil: 'edicao' };
function authentication(fetcher: ReturnType<typeof vi.fn<typeof fetch>>) {
  return fetcher
    .mockResolvedValueOnce(Response.json({ accessToken: 'token-sintetico', tokenType: 'Bearer', expiresIn: 60 }))
    .mockResolvedValueOnce(Response.json(identity));
}
async function setup(fetcher: typeof fetch, onSaved?: (data: unknown) => void) {
  const manager = new SessionManager(withRegisteredOperations(fetcher));
  managers.push(manager);
  await manager.login('sintetico@example.invalid', 'senha-sintetica');
  const router = createMemoryRouter([{ path: '/', element: <SessionProvider manager={manager}>
    <AuthenticatedDrafts onSaved={onSaved} />
  </SessionProvider> }]);
  routers.push(router);
  render(<RouterProvider router={router} />);
  return { manager, user: userEvent.setup() };
}

describe('escrita pendente durante remontagem de formulário', () => {
  it('preserva o rascunho, mostra o resultado incerto e impede novo envio após falha de rede', async () => {
    let fail!: (error: Error) => void;
    const fetcher = authentication(vi.fn<typeof fetch>())
      .mockReturnValueOnce(new Promise<Response>((_resolve, reject) => { fail = reject; }));
    const { user } = await setup(fetcher);
    await user.type(screen.getByLabelText('Nome sintético'), 'Rascunho clínico sintético');
    await user.click(screen.getByRole('button', { name: 'Salvar registro' }));
    expect(screen.getByRole('button', { name: 'Salvando…' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Ocultar durante reconsulta' }));
    expect(screen.queryByRole('form', { name: 'Registro sintético' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reabrir após reconsulta' }));
    expect(screen.getByLabelText('Nome sintético')).toHaveValue('Rascunho clínico sintético');
    expect(screen.getByRole('button', { name: 'Salvando…' })).toBeDisabled();

    await act(async () => { fail(new TypeError('Falha de rede exclusivamente sintética')); });
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível confirmar se a operação foi salva');
    expect(screen.getByLabelText('Nome sintético')).toHaveValue('Rascunho clínico sintético');
    const submit = screen.getByRole('button', { name: 'Salvar registro' });
    expect(submit).toBeDisabled();
    await user.click(submit);
    expect(fetcher.mock.calls.filter(([url]) => url === '/v1/regression-write')).toHaveLength(1);
  });

  it('oculta o rascunho durante 503 da identidade e o recupera na mesma sessão sem escrever', async () => {
    const fetcher = authentication(vi.fn<typeof fetch>())
      .mockResolvedValueOnce(Response.json({}, { status: 503 }))
      .mockResolvedValueOnce(Response.json(identity));
    const { manager, user } = await setup(fetcher);
    await user.type(screen.getByLabelText('Nome sintético'), 'Rascunho antes da revalidação');
    const originalScope = manager.getSnapshot().draftScope;
    await act(async () => { await manager.revalidate(); });
    expect(await screen.findByRole('alert')).toHaveTextContent('O serviço está indisponível');
    expect(screen.queryByLabelText('Nome sintético')).not.toBeInTheDocument();
    expect(manager.getSnapshot().draftScope).toBe(originalScope);

    await act(async () => { await manager.revalidate(); });
    expect(screen.getByLabelText('Nome sintético')).toHaveValue('Rascunho antes da revalidação');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(fetcher.mock.calls.filter(([url]) => url === '/v1/regression-write')).toHaveLength(0);
  });

  it('trata o envio abortado por 503 da identidade como incerto após recuperar o acesso', async () => {
    let writeSignal: AbortSignal | undefined;
    const fetcher = authentication(vi.fn<typeof fetch>())
      .mockImplementationOnce((_url, init) => new Promise<Response>((_resolve, reject) => {
        writeSignal = init?.signal ?? undefined;
        writeSignal?.addEventListener('abort', () => reject(new DOMException('Interrupção sintética', 'AbortError')), { once: true });
      }))
      .mockResolvedValueOnce(Response.json({}, { status: 503 }))
      .mockResolvedValueOnce(Response.json(identity));
    const { manager, user } = await setup(fetcher);
    await user.type(screen.getByLabelText('Nome sintético'), 'Rascunho de escrita interrompida');
    await user.click(screen.getByRole('button', { name: 'Salvar registro' }));
    expect(screen.getByRole('button', { name: 'Salvando…' })).toBeDisabled();
    await act(async () => { await manager.revalidate(); });
    expect(writeSignal?.aborted).toBe(true);
    expect(screen.queryByLabelText('Nome sintético')).not.toBeInTheDocument();

    await act(async () => { await manager.revalidate(); });
    expect(screen.getByLabelText('Nome sintético')).toHaveValue('Rascunho de escrita interrompida');
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível confirmar se a operação foi salva');
    expect(screen.getByRole('button', { name: 'Salvar registro' })).toBeDisabled();
    expect(fetcher.mock.calls.filter(([url]) => url === '/v1/regression-write')).toHaveLength(1);
  });

  it('descarta o rascunho ao sair e não o recupera em novo login da mesma identidade', async () => {
    const fetcher = authentication(vi.fn<typeof fetch>())
      .mockResolvedValueOnce(Response.json({ accessToken: 'outro-token-sintetico', tokenType: 'Bearer', expiresIn: 60 }))
      .mockResolvedValueOnce(Response.json(identity));
    const { manager, user } = await setup(fetcher);
    await user.type(screen.getByLabelText('Nome sintético'), 'Rascunho da sessão encerrada');
    act(() => manager.logout());
    expect(screen.queryByLabelText('Nome sintético')).not.toBeInTheDocument();
    await act(async () => { await manager.login('sintetico@example.invalid', 'senha-sintetica'); });
    expect(screen.getByLabelText('Nome sintético')).toHaveValue('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('não publica confirmação de uma escrita quando a sessão termina antes do callback', async () => {
    let finishJson!: (value: unknown) => void;
    const response = Response.json({ registroId: '42' }, { status: 201 });
    vi.spyOn(response, 'json').mockImplementation(() => new Promise(resolve => { finishJson = resolve; }));
    const fetcher = authentication(vi.fn<typeof fetch>()).mockResolvedValueOnce(response);
    const onSaved = vi.fn();
    const { manager, user } = await setup(fetcher, onSaved);
    const invalidate = vi.spyOn(manager.queries, 'invalidateQueries');
    await user.type(screen.getByLabelText('Nome sintético'), 'Rascunho da sessão anterior');
    await user.click(screen.getByRole('button', { name: 'Salvar registro' }));
    await act(async () => {
      finishJson({ registroId: '42' });
      queueMicrotask(() => manager.logout());
    });
    expect(manager.getSnapshot().status).toBe('anonymous');
    expect(screen.queryByLabelText('Nome sintético')).not.toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
    expect(fetcher.mock.calls.filter(([url]) => url === '/v1/regression-write')).toHaveLength(1);
  });

  it.each([
    ['identidade', { ...identity, usuarioId: '2', nome: 'Outra pessoa sintética' }],
    ['perfil', { ...identity, perfil: 'administracao' }],
  ])('descarta o rascunho quando muda a %s efetiva', async (_change, nextIdentity) => {
    const fetcher = authentication(vi.fn<typeof fetch>()).mockResolvedValueOnce(Response.json(nextIdentity));
    const { manager, user } = await setup(fetcher);
    await user.type(screen.getByLabelText('Nome sintético'), 'Rascunho do acesso anterior');
    await act(async () => { await manager.revalidate(); });
    expect(screen.getByLabelText('Nome sintético')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Salvar registro' })).toBeDisabled();
  });
});
