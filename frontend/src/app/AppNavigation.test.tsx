import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation, useNavigate } from 'react-router';
import { AppNavigation } from './AppNavigation';

const user = { usuarioId: '9007199254740993', nome: 'Profissional Sintético de Navegação', perfil: 'consulta' as const };
afterEach(() => vi.unstubAllGlobals());
function Context() {
  const location = useLocation(); const navigate = useNavigate();
  return <main id="conteudo" tabIndex={-1}><output>{location.pathname}{location.search}</output>
    <button onClick={() => navigate(-1)}>Voltar no navegador</button></main>;
}
function setup(logout = vi.fn()) {
  return { ...render(<MemoryRouter initialEntries={['/']}><AppNavigation user={user} logout={logout} /><Context /></MemoryRouter>),
    logout, keyboard: userEvent.setup() };
}

describe('7D-U4.1 — navegação por disclosure sem diálogo modal', () => {
  it('relaciona controle e conteúdo, preservando nome/perfil e rotas reais', () => {
    setup();
    const control = screen.getByRole('button', { name: 'Menu' });
    const content = document.getElementById(control.getAttribute('aria-controls')!)!;
    expect(control).toHaveAttribute('aria-expanded', 'false');
    expect(content).toHaveAttribute('data-expanded', 'false');
    const nav = within(screen.getByRole('navigation', { name: 'Menu principal' }));
    expect(nav.getByRole('link', { name: 'Início' })).toHaveAttribute('href', '/');
    expect(nav.getByRole('link', { name: 'Início' })).toHaveAttribute('aria-current', 'page');
    expect(nav.getByRole('link', { name: 'Pacientes' })).toHaveAttribute('href', '/pacientes');
    expect(nav.getByRole('link', { name: 'Minha conta' })).toHaveAttribute('href', '/minha-conta');
    expect(content).toHaveTextContent(user.nome);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('abre por teclado e Escape dentro do menu fecha e devolve foco ao controle', async () => {
    const { keyboard } = setup();
    screen.getByRole('button', { name: 'Menu' }).focus();
    await keyboard.keyboard('{Enter}');
    const control = screen.getByRole('button', { name: 'Fechar menu' });
    expect(control).toHaveAttribute('aria-expanded', 'true');
    within(screen.getByRole('navigation')).getByRole('link', { name: 'Pacientes' }).focus();
    await keyboard.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('fecha após navegação confirmada e mantém o destino ao voltar', async () => {
    const { keyboard } = setup();
    await keyboard.click(screen.getByRole('button', { name: 'Menu' }));
    await keyboard.click(within(screen.getByRole('navigation')).getByRole('link', { name: 'Minha conta' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'false'));
    expect(screen.getByRole('status')).toHaveTextContent('/minha-conta');
    expect(within(screen.getByRole('navigation')).getByRole('link', { name: 'Minha conta' })).toHaveAttribute('aria-current', 'page');
    await keyboard.click(screen.getByRole('button', { name: 'Voltar no navegador' }));
    expect(screen.getByRole('status')).toHaveTextContent('/');
  });

  it('sair chama somente o encerramento de sessão', async () => {
    const { keyboard, logout } = setup();
    await keyboard.click(screen.getByRole('button', { name: 'Menu' }));
    await keyboard.click(screen.getByRole('button', { name: 'Sair' }));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('mudança de breakpoint fecha o menu sem deixar foco num controle oculto', async () => {
    let changed!: (event: MediaQueryListEvent) => void;
    const remove = vi.fn();
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      addEventListener: (_: string, listener: typeof changed) => { changed = listener; }, removeEventListener: remove,
    })));
    const { keyboard, unmount } = setup();
    const account = within(screen.getByRole('navigation')).getByRole('link', { name: 'Minha conta' });
    account.focus();
    account.blur();
    act(() => changed({ matches: true } as MediaQueryListEvent));
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveFocus();
    await keyboard.click(screen.getByRole('button', { name: 'Menu' }));
    screen.getByRole('button', { name: 'Fechar menu' }).blur();
    act(() => changed({ matches: false } as MediaQueryListEvent));
    expect(screen.getByRole('main')).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'false');
    unmount(); expect(remove).toHaveBeenCalledWith('change', changed);
  });
});
