import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import App, { returnDestination } from './App';
import { SessionProvider } from './session';
import { SessionManager } from './SessionManager';

const managers: SessionManager[] = [];
afterEach(() => managers.splice(0).forEach(manager => manager.dispose()));

function setup(fetcher: typeof fetch, path = '/login?next=%2Fminha-conta') {
  const manager = new SessionManager(fetcher);
  managers.push(manager);
  render(<MemoryRouter initialEntries={[path]}><SessionProvider manager={manager}><App /></SessionProvider></MemoryRouter>);
  return { manager, user: userEvent.setup() };
}

describe('login e navegação', () => {
  it('campos vazios não enviam; carregamento anuncia e bloqueia autenticação repetida', async () => {
    let release!: (response: Response) => void;
    const fetcher = vi.fn<typeof fetch>().mockImplementationOnce(() => new Promise(resolve => { release = resolve; }))
      .mockResolvedValueOnce(Response.json({ usuarioId: '42', nome: 'Profissional Sintético', perfil: 'consulta' }));
    const { user } = setup(fetcher);
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(fetcher).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText('Usuário', { exact: true }), 'sintetico@example.invalid');
    await user.type(screen.getByLabelText('Senha', { exact: true }), 'senha-sintetica');
    expect(screen.getByLabelText('Senha', { exact: true })).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(screen.getByRole('status')).toHaveTextContent('Verificando seu acesso');
    expect(screen.getByRole('button', { name: 'Entrando…' })).toBeDisabled();
    fireEvent.submit(screen.getByRole('button', { name: 'Entrando…' }).closest('form')!);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await act(async () => release(Response.json({ accessToken: 'sintetico', tokenType: 'Bearer', expiresIn: 60 })));
    expect(await screen.findByRole('heading', { name: 'Minha conta', level: 1 })).toBeVisible();
    expect(fetcher.mock.calls.map(call => call[0])).toEqual(['/v1/auth/login', '/v1/auth/me']);
    await user.click(screen.getByRole('button', { name: 'Sair da conta' }));
    expect(await screen.findByLabelText('Senha', { exact: true })).toHaveValue('');
  });

  it('retorna ao destino protegido após login e exibe somente identidade do servidor', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ accessToken: 'sintetico', tokenType: 'Bearer', expiresIn: 60 }))
      .mockResolvedValueOnce(Response.json({ usuarioId: '42', nome: 'Profissional Sintético', perfil: 'consulta' }));
    const { user } = setup(fetcher, '/minha-conta');
    await user.type(screen.getByLabelText('Usuário', { exact: true }), 'sintetico@example.invalid');
    await user.type(screen.getByLabelText('Senha', { exact: true }), 'senha-sintetica');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('heading', { name: 'Minha conta', level: 1 })).toBeVisible();
    expect(screen.getByText('42')).toBeVisible();
    expect(screen.getByText('Profissional Sintético', { selector: 'dd' })).toBeVisible();
    expect(fetcher.mock.calls.map(call => call[0])).toEqual(['/v1/auth/login', '/v1/auth/me']);
    await user.click(screen.getByRole('button', { name: 'Sair' }));
    expect(await screen.findByRole('heading', { name: 'Entre na sua conta' })).toBeVisible();
    expect(screen.queryByText('42')).not.toBeInTheDocument();
  });

  it.each([401, 429, 503, 0])('apresenta falha %i com foco na mensagem e preserva o usuário informado', async status => {
    const fetcher = vi.fn<typeof fetch>();
    if (status) fetcher.mockResolvedValue(Response.json({ message: 'SQL sintético não deve vazar' }, { status }));
    else fetcher.mockRejectedValue(new TypeError('fetch failed'));
    const { user } = setup(fetcher);
    await user.type(screen.getByLabelText('Usuário', { exact: true }), 'sintetico@example.invalid');
    await user.type(screen.getByLabelText('Senha', { exact: true }), 'senha-sintetica');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    const alert = await screen.findByRole('alert');
    await waitFor(() => expect(alert).toHaveFocus());
    expect(alert).not.toHaveTextContent('SQL');
    expect(screen.getByLabelText('Usuário', { exact: true })).toHaveValue('sintetico@example.invalid');
    expect(screen.queryByRole('heading', { name: 'Minha conta', level: 1 })).not.toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each(['https://example.invalid', '//example.invalid', '/\\example.invalid', '/login'])('recusa destino externo ou circular %s', path => {
    expect(returnDestination(path)).toBe('/');
  });
});
