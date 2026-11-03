import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import App from '../../app/App';
import { SessionManager } from '../../app/SessionManager';
import { SessionProvider } from '../../app/session';

const managers: SessionManager[] = [];
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => managers.splice(0).forEach(manager => manager.dispose()));
async function setup({ lost = false, profile = 'administracao', mandatory = false, path = '/usuarios/novo' } = {}) {
  let receipt: Record<string, unknown> | undefined;
  const writes = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
    const dto = JSON.parse(String(init?.body));
    if (_url === '/v1/auth/senha') return Response.json({ alterada: true }, { status: 201 });
    receipt = { operacaoId: dto.operacaoId, usuarioId: '43', atorUsuarioId: '42', instante: '2026-11-03T12:00:00Z', operacao: 'criacao', resultado: 'aplicada', nome: dto.nome, login: dto.login, perfil: dto.perfil };
    if (lost) throw new TypeError('Resposta sintética perdida');
    return Response.json({ recibo: receipt, credencialTemporaria: 'Segredo-Sintetico-Descartavel!', expiraEm: '2026-11-04T12:00:00Z' }, { status: 201 });
  });
  const fetcher: typeof fetch = async (url, init) => {
    if (url === '/v1/auth/login') return Response.json({ accessToken: 'sintetico', tokenType: 'Bearer', expiresIn: 900 });
    if (url === '/v1/auth/me') return Response.json({ usuarioId: '42', nome: 'Admin sintético', perfil: profile, ...(mandatory ? { trocaObrigatoria: true } : {}) });
    if (init?.method === 'POST') return writes(url, init);
    if (String(url).startsWith('/v1/usuarios/criacoes/')) return receipt ? Response.json(receipt) : Response.json({}, { status: 404 });
    if (url === '/v1/usuarios/43') return Response.json({ usuarioId: '43', nome: 'Conta Sintética', login: 'nova-conta', perfil: 'consulta', ativo: true, versao: '1' });
    throw new Error(`Rota inesperada ${url}`);
  };
  const manager = new SessionManager(fetcher); managers.push(manager); await manager.login('sintetico', 'senha-sintetica');
  render(<MemoryRouter initialEntries={[path]}><SessionProvider manager={manager}><App /></SessionProvider></MemoryRouter>);
  return { writes, manager, user: userEvent.setup() };
}
async function review(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nome completo'), 'Conta Sintética');
  await user.type(screen.getByLabelText('Login', { exact: true }), 'Nova-Conta');
  await user.selectOptions(screen.getByLabelText('Perfil inicial'), 'consulta');
  await user.click(screen.getByRole('button', { name: 'Revisar criação' }));
}

describe('8D2U.3 criação e primeiro acesso', () => {
  it('revisa, cancela e Escape preservam dados sem escrita', async () => {
    const { user, writes } = await setup(); await review(user);
    expect(screen.getByRole('dialog')).toHaveTextContent('nova-conta');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('button', { name: 'Revisar criação' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Revisar criação' }));
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: true, cancelable: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(writes).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Nome completo')).toHaveValue('Conta Sintética');
  });
  it('cria uma vez, relê conta e encerra exibição única sem reexibir em consulta', async () => {
    const { user, writes } = await setup(); await review(user);
    await user.dblClick(screen.getByRole('button', { name: 'Confirmar criação' }));
    expect(await screen.findByLabelText('Credencial temporária')).toHaveValue('Segredo-Sintetico-Descartavel!');
    expect(screen.getByText(/Conta relida:/)).toHaveTextContent('ativa'); expect(writes).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(writes.mock.calls[0]![1]?.body))).toMatchObject({ login: 'nova-conta', perfil: 'consulta' });
    await user.click(screen.getByRole('button', { name: 'Encerrar exibição da credencial' }));
    expect(screen.queryByDisplayValue('Segredo-Sintetico-Descartavel!')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Consultar resultado da criação' }));
    expect(screen.queryByDisplayValue('Segredo-Sintetico-Descartavel!')).not.toBeInTheDocument(); expect(writes).toHaveBeenCalledTimes(1);
  });
  it('resposta perdida oferece só consulta e nunca repete criação', async () => {
    const { user, writes } = await setup({ lost: true }); await review(user);
    await user.click(screen.getByRole('button', { name: 'Confirmar criação' }));
    expect(await screen.findByText(/Resposta não confirmada/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Revisar criação' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Consultar resultado da criação' }));
    expect(await screen.findByRole('heading', { name: 'Usuário criado' })).toBeVisible();
    expect(screen.getByText(/A credencial não pode ser consultada novamente/)).toBeVisible(); expect(writes).toHaveBeenCalledTimes(1);
  });
  it.each(['consulta', 'edicao'])('perfil %s não acessa criação por URL direta', async profile => {
    const { writes } = await setup({ profile });
    expect(screen.getByRole('heading', { name: 'Acesso administrativo necessário' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Revisar criação' })).not.toBeInTheDocument(); expect(writes).not.toHaveBeenCalled();
  });
  it('primeiro acesso bloqueia destino clínico, troca senha e exige novo login', async () => {
    const { user, writes, manager } = await setup({ mandatory: true, path: '/pacientes' });
    expect(screen.getByRole('heading', { name: 'Defina sua nova senha' })).toBeVisible();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Credencial temporária'), 'Temporaria-Sintetica!');
    await user.type(screen.getByLabelText('Nova senha', { exact: true }), 'Nova-Sintetica123!');
    await user.type(screen.getByLabelText('Confirme a nova senha'), 'Nova-Sintetica123!');
    await user.click(screen.getByRole('button', { name: 'Confirmar nova senha' }));
    expect(await screen.findByText(/Senha alterada/)).toBeVisible(); expect(writes).toHaveBeenCalledTimes(1);
    expect(writes.mock.calls[0]![0]).toBe('/v1/auth/senha');
    await act(async () => { await user.click(screen.getByRole('button', { name: 'Entrar com a nova senha' })); });
    expect(manager.getSnapshot().status).toBe('anonymous');
    expect(screen.getByRole('heading', { name: 'Entre na sua conta' })).toBeVisible();
  });
});
