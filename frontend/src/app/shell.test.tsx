import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import App from './App';
import { SessionManager } from './SessionManager';
import { SessionProvider } from './session';

const managers: SessionManager[] = [];
afterEach(() => managers.splice(0).forEach(manager => manager.dispose()));
async function setup(path = '/minha-conta') {
  let unavailable = false;
  const fetcher = vi.fn<typeof fetch>(async url => {
    if (url === '/v1/auth/login') return Response.json({ accessToken: 'sintetico', tokenType: 'Bearer', expiresIn: 900 });
    if (url === '/v1/auth/me') return unavailable ? Response.json({ message: 'Detalhe interno não deve aparecer' }, { status: 503 })
      : Response.json({ usuarioId: '9007199254740993', nome: 'Profissional Sintético', perfil: 'consulta' });
    throw new Error(`Leitura inesperada: ${url}`);
  });
  const manager = new SessionManager(fetcher); managers.push(manager);
  await manager.login('consulta@example.invalid', 'senha-sintetica');
  render(<MemoryRouter initialEntries={[path]}><SessionProvider manager={manager}><App /></SessionProvider></MemoryRouter>);
  return { manager, fetcher, user: userEvent.setup(), unavailable: (value: boolean) => { unavailable = value; } };
}

describe('7D-U4.1 — conta, falha de identidade e página desconhecida', () => {
  it('mostra identidade real e orientação de suporte, sem inventar login/status ou edição de perfil', async () => {
    const { user, fetcher } = await setup();
    expect(screen.getByRole('heading', { name: 'Minha conta', level: 1 })).toBeVisible();
    expect(screen.getByText('9007199254740993')).toBeVisible();
    expect(screen.getByText('Profissional Sintético', { selector: 'dd' })).toBeVisible();
    expect(screen.getByText(/procure a equipe responsável/)).toBeVisible();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sair da conta' }));
    expect(await screen.findByRole('heading', { name: 'Entre na sua conta' })).toBeVisible();
    expect(screen.queryByText('9007199254740993')).not.toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('falha de identidade oculta a conta, foca orientação e recupera por leitura no mesmo destino', async () => {
    const { manager, user, unavailable, fetcher } = await setup();
    unavailable(true); await act(async () => manager.revalidate());
    const heading = screen.getByRole('heading', { name: 'Não foi possível verificar seu acesso' });
    expect(heading.parentElement!.parentElement).toHaveFocus();
    expect(screen.queryByText('9007199254740993')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).not.toHaveTextContent('Detalhe interno');
    unavailable(false); await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Minha conta', level: 1 })).toBeVisible());
    expect(screen.getByRole('main')).toHaveFocus();
    expect(fetcher.mock.calls.map(call => call[0])).toEqual(['/v1/auth/login', '/v1/auth/me', '/v1/auth/me', '/v1/auth/me']);
  });

  it('falha de identidade permite saída explícita e apaga a identidade', async () => {
    const { manager, user, unavailable } = await setup();
    unavailable(true); await act(async () => manager.revalidate());
    await user.click(screen.getByRole('button', { name: 'Sair da conta' }));
    expect(await screen.findByRole('heading', { name: 'Entre na sua conta' })).toBeVisible();
    expect(manager.getSnapshot().user).toBeNull();
  });

  it('endereço desconhecido oferece início e busca sem alegar remoção do paciente', async () => {
    const { user } = await setup('/endereco-inexistente');
    expect(screen.getByRole('heading', { name: 'Página não disponível' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Consultar pacientes' })).toHaveAttribute('href', '/pacientes');
    expect(screen.queryByText(/removid|excluíd/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Ir para o início' }));
    expect(screen.getByRole('heading', { name: 'Início', level: 1 })).toBeVisible();
    expect(screen.getByRole('main')).toHaveFocus();
  });
});
