import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { SessionManager } from '../../app/SessionManager';
import { SessionProvider } from '../../app/session';
import { DraftProvider } from '../../shared/writing';
import UsuariosPage from './UsuariosPage';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
const resources: Array<{ manager: SessionManager; router: ReturnType<typeof createMemoryRouter> }> = [];
afterEach(() => resources.splice(0).forEach(({ manager, router }) => { router.dispose(); manager.dispose(); }));
async function setup(code = 201, operation = '', profile = 'administracao', self = false) {
  let current = { usuarioId: '9007199254740993', nome: 'Alvo sintético', login: 'alvo-sintetico', perfil: 'consulta', ativo: true, versao: '1' };
  let receipt: Record<string, unknown> | undefined;
  let receiptFails = false; let readFails = false;
  const writes = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
    const dto = JSON.parse(String(init?.body));
    receipt = { ...dto, usuarioId: current.usuarioId, atorUsuarioId: '42', operacao: 'perfil', instante: '2026-11-03T10:00:00Z',
      anterior: current.perfil, novo: dto.perfil, versaoAnterior: current.versao, versaoNova: code === 201 ? '2' : '1',
      resultado: code === 409 ? 'versao_obsoleta' : code === 403 ? 'autoacao_proibida' : 'aplicada' };
    if (code === 201 || code === 0) current = { ...current, perfil: dto.perfil, versao: '2' };
    if (code === 0) throw new TypeError('Resposta perdida');
    return Response.json(receipt, { status: code });
  });
  const fetcher: typeof fetch = async (url, init) => {
    if (url === '/v1/auth/login') return Response.json({ accessToken: 'sintetico', tokenType: 'Bearer', expiresIn: 900 });
    if (url === '/v1/auth/me') return Response.json({ usuarioId: self ? current.usuarioId : '42', nome: 'Admin sintético', perfil: profile });
    if (init?.method === 'POST') return writes(url, init);
    if (String(url).includes('/operacoes/')) return receiptFails || !receipt ? Response.json({}, { status: 404 }) : Response.json(receipt);
    if (url === `/v1/usuarios/${current.usuarioId}`) return readFails ? Response.json({}, { status: 503 }) : Response.json(current);
    throw new Error(`Rota sintética inesperada: ${url}`);
  };
  const manager = new SessionManager(fetcher); await manager.login('sintetico', 'senha-sintetica');
  const router = createMemoryRouter([{ path: '/usuarios/:usuarioId', element: <SessionProvider manager={manager}><DraftProvider><UsuariosPage /></DraftProvider></SessionProvider> }],
    { initialEntries: [`/usuarios/${current.usuarioId}${operation ? `?operacao=${operation}` : ''}`] });
  resources.push({ manager, router }); render(<RouterProvider router={router} />);
  await screen.findByRole('heading', { name: profile === 'administracao' ? 'Dados do usuário' : 'Acesso administrativo necessário' });
  const user = userEvent.setup();
  return { user, writes, router, manager, setReceiptFails: (value: boolean) => { receiptFails = value; },
    setReadFails: (value: boolean) => { readFails = value; },
    changeCurrent: () => { current = { ...current, perfil: 'administracao', versao: '3' }; } };
}
async function review(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(await screen.findByLabelText('Novo perfil'), 'edicao');
  await user.type(screen.getByLabelText('Justificativa'), 'Ajuste sintético justificado');
  await user.click(screen.getByRole('button', { name: 'Revisar alteração' }));
  return screen.getByRole('dialog');
}

describe('8D2U.1 perfil administrativo integrado', () => {
  it('revisa anterior/novo, cancela/Escape sem escrever e devolve foco', async () => {
    const { user, writes } = await setup(); const dialog = await review(user);
    expect(dialog).toHaveTextContent('Consulta → Edição'); expect(dialog).toHaveTextContent('Versão 1');
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('button', { name: 'Revisar alteração' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Revisar alteração' }));
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: true, cancelable: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(writes).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Revisar alteração' }));
    await user.click(screen.getByRole('button', { name: 'Fechar revisão' }));
    expect(writes).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Justificativa')).toHaveValue('Ajuste sintético justificado');
  });
  it('confirma uma intenção, mostra recibo e relê versão persistida', async () => {
    const { user, writes } = await setup(); await review(user);
    await user.dblClick(screen.getByRole('button', { name: 'Confirmar alteração' }));
    expect(await screen.findByText('Alteração de perfil confirmada.')).toBeVisible();
    expect(writes).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(writes.mock.calls[0]![1]?.body))).toMatchObject({ perfil: 'edicao', versao: '1', justificativa: 'Ajuste sintético justificado' });
    await waitFor(() => expect(screen.getByText(/Versão da conta:/)).toHaveTextContent('2'));
    expect(screen.getByRole('button', { name: 'Revisar alteração' })).toBeDisabled();
  });
  it('resposta perdida bloqueia reenvio, consulta recibo e recupera sem nova escrita', async () => {
    const { user, writes, setReceiptFails } = await setup(0); await review(user);
    await user.click(screen.getByRole('button', { name: 'Confirmar alteração' }));
    expect(await screen.findByText(/Resposta não confirmada/)).toBeVisible(); setReceiptFails(true);
    await user.click(screen.getByRole('button', { name: 'Consultar resultado' }));
    expect(await screen.findByText(/resultado permanece indeterminado/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Revisar alteração' })).toBeDisabled();
    setReceiptFails(false); await user.click(screen.getByRole('button', { name: 'Consultar resultado' }));
    expect(await screen.findByText('Alteração de perfil confirmada.')).toBeVisible(); expect(writes).toHaveBeenCalledTimes(1);
  });
  it('409 preserva escolha, compara versão atual e exige preparação explícita', async () => {
    const { user, writes, changeCurrent } = await setup(409); await review(user);
    await user.click(screen.getByRole('button', { name: 'Confirmar alteração' }));
    expect(await screen.findByText(/Conflito: sua escolha/)).toBeVisible(); changeCurrent();
    await user.click(screen.getByRole('button', { name: 'Consultar resultado' }));
    expect(await screen.findByText(/A conta mudou desde a leitura/)).toBeVisible();
    expect(screen.getByLabelText('Novo perfil')).toHaveValue('edicao');
    await user.click(screen.getByRole('button', { name: 'Preparar nova revisão' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Revisar alteração' })).toBeEnabled());
    expect(screen.getByText(/Versão da conta:/)).toHaveTextContent('3'); expect(writes).toHaveBeenCalledTimes(1);
  });
  it('recibo aplicado permanece distinto de falha na releitura', async () => {
    const { user, setReadFails, writes } = await setup(); await review(user); setReadFails(true);
    await user.click(screen.getByRole('button', { name: 'Confirmar alteração' }));
    expect(await screen.findByText(/Falha ao reler o estado atual/)).toBeVisible(); expect(writes).toHaveBeenCalledTimes(1);
  });
  it('recuperação por código após recarga não emite comando', async () => {
    const { user, writes } = await setup(201, 'aaaabbbb-1111-4222-8333-abcdef123456');
    await user.click(await screen.findByRole('button', { name: 'Consultar resultado' }));
    expect(await screen.findByText(/resultado permanece indeterminado/)).toBeVisible(); expect(writes).not.toHaveBeenCalled();
  });
  it('revalidação preserva rascunho e versão de origem sem sobrescrever escolha', async () => {
    const { user, manager, changeCurrent } = await setup();
    await user.selectOptions(await screen.findByLabelText('Novo perfil'), 'edicao');
    await user.type(screen.getByLabelText('Justificativa'), 'Rascunho sintético preservado'); changeCurrent();
    await manager.revalidate();
    expect(await screen.findByLabelText('Novo perfil')).toHaveValue('edicao');
    expect(screen.getByLabelText('Justificativa')).toHaveValue('Rascunho sintético preservado');
    expect(screen.getByText(/Versão da conta:/)).toHaveTextContent('1');
  });
  it('autoação orienta outro administrador sem exibir comando', async () => {
    const { writes } = await setup(201, '', 'administracao', true);
    expect(await screen.findByText(/Não é permitido alterar o próprio perfil/)).toBeVisible();
    expect(screen.queryByLabelText('Novo perfil')).not.toBeInTheDocument(); expect(writes).not.toHaveBeenCalled();
  });
  it.each(['consulta', 'edicao'])('%s não recebe formulário administrativo', async profile => {
    const { writes } = await setup(201, '', profile);
    expect(screen.queryByLabelText('Novo perfil')).not.toBeInTheDocument(); expect(writes).not.toHaveBeenCalled();
  });
});
