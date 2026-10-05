import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Link, Route, RouterProvider, Routes } from 'react-router';
import { SessionProvider, useSession } from '../app/session';
import { SessionManager } from '../app/SessionManager';
import { DraftProvider, MutationForm, useClinicalDraft } from './writing';

const managers: SessionManager[] = [];
afterEach(() => managers.splice(0).forEach(manager => manager.dispose()));

function WritingExample() {
  const [draft, setDraft] = useClinicalDraft('example', { value: '', operationKey: 'test-operation' });
  return <><h1>Formulário sintético</h1><Link to="/read">Consultar registro</Link>
    <MutationForm title="Criar exemplo" path="/pacientes/9007199254740993/atendimentos" method="POST" dirty={draft.value !== ''}
      buildBody={() => ({ observacoes: draft.value, dataAtendimento: '2026-02-01' })}
      verificationPath="/read" operationKey={draft.operationKey} responseId="atendimentoId">
      <label htmlFor="draft">Observação sintética</label><input id="draft" value={draft.value}
        onChange={event => setDraft({ ...draft, value: event.target.value })} />
    </MutationForm></>;
}
function ExampleShell() {
  const session = useSession();
  return <DraftProvider key={session.draftScope}>
    <button onClick={session.logout}>Sair</button>
    {session.status === 'authenticated' ? <Routes><Route path="/write" element={<WritingExample />} />
      <Route path="/read" element={<><h1>Consulta sintética</h1><Link to="/write">Retomar formulário</Link></>} /></Routes>
      : <p>Sessão encerrada</p>}
  </DraftProvider>;
}
async function setup(response: () => Promise<Response>) {
  const writes = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => response());
  const fetcher = vi.fn<typeof fetch>(async (url, init) => {
    if (url === '/v1/auth/login') return Response.json({ accessToken: 'sintetico', tokenType: 'Bearer', expiresIn: 60 });
    if (url === '/v1/auth/me') return Response.json({ usuarioId: '42', nome: 'Profissional sintético', perfil: 'edicao' });
    return writes(url, init);
  });
  const manager = new SessionManager(fetcher); managers.push(manager);
  await manager.login('sintetico@example.invalid', 'senha-sintetica');
  const router = createMemoryRouter([{ path: '*', element: <SessionProvider manager={manager}><ExampleShell /></SessionProvider> }], { initialEntries: ['/write'] });
  render(<RouterProvider router={router} />);
  return { writes, manager, router, user: userEvent.setup() };
}

describe('rascunhos e confirmação de escrita', () => {
  it('protege navegação, mantém rascunho na sessão e o apaga ao sair', async () => {
    const { user, writes, manager } = await setup(async () => Response.json({ atendimentoId: '91' }));
    await user.type(screen.getByLabelText('Observação sintética'), 'Rascunho sintético');
    await user.click(screen.getByRole('link', { name: 'Consultar registro' }));
    const dialog = await screen.findByRole('dialog', { name: 'Alterações não salvas' });
    expect(dialog).toBeVisible();
    const stay = within(dialog).getByRole('button', { name: 'Continuar editando' });
    const leave = within(dialog).getByRole('button', { name: 'Sair e manter rascunho' });
    expect(stay).toHaveFocus();
    await user.tab({ shift: true });
    expect(leave).toHaveFocus();
    await user.tab();
    expect(stay).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Continuar editando' }));
    expect(screen.getByRole('link', { name: 'Consultar registro' })).toHaveFocus();
    expect(screen.getByLabelText('Observação sintética')).toHaveValue('Rascunho sintético');
    await user.click(screen.getByRole('link', { name: 'Consultar registro' }));
    await user.click(screen.getByRole('button', { name: 'Sair e manter rascunho' }));
    const unload = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);
    await user.click(screen.getByRole('link', { name: 'Retomar formulário' }));
    expect(screen.getByLabelText('Observação sintética')).toHaveValue('Rascunho sintético');
    expect(writes).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /^Sair$/ }));
    await act(async () => { await manager.login('sintetico@example.invalid', 'senha-sintetica'); });
    expect(await screen.findByLabelText('Observação sintética')).toHaveValue('');
    const cleanUnload = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(cleanUnload);
    expect(cleanUnload.defaultPrevented).toBe(false);
  });
  it.each([409, 403, 0, 503])('recusa sucesso fictício e reenvio após falha %i, mantendo o rascunho', async status => {
    const { user, writes } = await setup(async () => {
      if (status === 0) throw new TypeError('falha sintética de rede');
      return Response.json({ message: 'SQL sintético secreto' }, { status });
    });
    await user.type(screen.getByLabelText('Observação sintética'), 'Dados sintéticos válidos');
    await user.click(screen.getByRole('button', { name: 'Salvar registro' }));
    const error = await screen.findByRole('alert');
    expect(error).not.toHaveTextContent('SQL');
    expect(screen.getByRole('button', { name: 'Salvar registro' })).toBeDisabled();
    expect(screen.getByLabelText('Observação sintética')).toHaveValue('Dados sintéticos válidos');
    expect(writes).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Registro salvo.')).not.toBeInTheDocument();
    if (status === 0 || status >= 500) {
      expect(error).toHaveTextContent('Não foi possível confirmar se a operação foi salva');
      await user.click(screen.getByRole('link', { name: 'Verificar registro salvo' }));
      await user.click(screen.getByRole('button', { name: 'Sair e manter rascunho' }));
      await user.click(screen.getByRole('link', { name: 'Retomar formulário' }));
      expect(screen.getByRole('button', { name: 'Salvar registro' })).toBeDisabled();
      expect(writes).toHaveBeenCalledTimes(1);
    }
  });
  it('envia uma única vez, bloqueia campos enquanto aguarda e confirma apenas a resposta', async () => {
    let finish!: (value: Response) => void;
    const { user, writes } = await setup(() => new Promise(resolve => { finish = resolve; }));
    await user.type(screen.getByLabelText('Observação sintética'), 'Envio sintético');
    const submit = screen.getByRole('button', { name: 'Salvar registro' });
    await user.dblClick(submit);
    expect(screen.getByLabelText('Observação sintética')).toBeDisabled();
    expect(writes).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Registro salvo.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Consultar registro' }));
    const dialog = await screen.findByRole('dialog', { name: 'Alterações não salvas' });
    const stay = within(dialog).getByRole('button', { name: 'Continuar editando' });
    expect(within(dialog).getByRole('button', { name: 'Sair e manter rascunho' })).toBeDisabled();
    await user.tab();
    expect(stay).toHaveFocus();
    await user.tab({ shift: true });
    expect(stay).toHaveFocus();
    await user.click(stay);
    await act(async () => { finish(Response.json({ atendimentoId: '9007199254740994' })); });
    await waitFor(() => expect(screen.getByText('Registro salvo.')).toBeVisible());
    expect(screen.getByRole('button', { name: 'Salvar registro' })).toBeDisabled();
  });
  it.each([null, {}, { pacienteId: '91' }, { atendimentoId: 91 }, { atendimentoId: 'id-invalido' }])(
    'não confirma uma resposta sem o ID canônico textual: %j', async response => {
      const { user, writes } = await setup(async () => Response.json(response));
      await user.type(screen.getByLabelText('Observação sintética'), 'Rascunho com confirmação inválida');
      await user.click(screen.getByRole('button', { name: 'Salvar registro' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível confirmar se a operação foi salva');
      expect(screen.getByLabelText('Observação sintética')).toHaveValue('Rascunho com confirmação inválida');
      expect(screen.getByRole('button', { name: 'Salvar registro' })).toBeDisabled();
      expect(screen.queryByText('Registro salvo.')).not.toBeInTheDocument();
      expect(writes).toHaveBeenCalledTimes(1);
    },
  );
});
