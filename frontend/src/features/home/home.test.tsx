import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { SessionManager } from '../../app/SessionManager';
import { SessionProvider } from '../../app/session';
import type { Perfil } from '../../api/contracts';
import HomePage from './HomePage';

const managers: SessionManager[] = [];
afterEach(() => managers.splice(0).forEach(manager => manager.dispose()));
function Destination() { const location = useLocation(); return <output>{location.pathname}{location.search}</output>; }
async function setup(perfil: Perfil, podeCadastrar = true) {
  const fetcher = vi.fn<typeof fetch>(async url => {
    if (url === '/v1/auth/login') return Response.json({ accessToken: 'sintetico', tokenType: 'Bearer', expiresIn: 900 });
    if (url === '/v1/auth/me') return Response.json({ usuarioId: '42', nome: 'Profissional Sintético', perfil });
    if (url === '/v1/pacientes/capacidades') return Response.json({ podeCadastrar });
    throw new Error(`Leitura inesperada: ${url}`);
  });
  const manager = new SessionManager(fetcher); managers.push(manager);
  await manager.login('sintetico', 'senha-sintetica');
  render(<MemoryRouter><SessionProvider manager={manager}><HomePage /><Destination /></SessionProvider></MemoryRouter>);
  return { fetcher, user: userEvent.setup() };
}

describe('Início operacional por perfil', () => {
  it.each(['consulta', 'edicao', 'administracao'] as const)('orienta %s sem repetir os indicadores analíticos', async perfil => {
    await setup(perfil);
    expect(screen.getByRole('heading', { name: 'Início', level: 1 })).toBeVisible();
    expect(screen.getByText('Profissional Sintético', { selector: 'strong' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Abrir Dashboard' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: 'Consultar importações' })).toHaveAttribute('href', '/importacoes');
    expect(screen.queryByText('Indicadores do ambulatório')).not.toBeInTheDocument();
    if (perfil === 'consulta') {
      expect(screen.queryByRole('link', { name: 'Cadastrar paciente' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Simular planilha' })).not.toBeInTheDocument();
      expect(screen.getByText(/Seu perfil permite consultar os registros autorizados/)).toBeVisible();
    } else {
      expect(await screen.findByRole('link', { name: 'Cadastrar paciente' })).toHaveAttribute('href', '/pacientes/novo');
      expect(screen.getByRole('link', { name: 'Simular planilha' })).toHaveAttribute('href', '/importacoes/simular');
      expect(screen.getByText(/Preencha as 12 seções/)).toBeVisible();
    }
    if (perfil === 'administracao') expect(screen.getByRole('link', { name: 'Gerenciar usuários' })).toHaveAttribute('href', '/usuarios');
    else expect(screen.queryByRole('link', { name: 'Gerenciar usuários' })).not.toBeInTheDocument();
  });

  it('busca do início leva o nome escapado para o filtro real de pacientes', async () => {
    const { user } = await setup('consulta');
    await user.type(screen.getByLabelText('Nome do paciente'), ' Ana & Maria ');
    await user.click(screen.getByRole('button', { name: 'Buscar paciente' }));
    expect(screen.getByRole('status')).toHaveTextContent('/pacientes?nome=Ana+%26+Maria');
  });

  it('capacidade negativa não apresenta cadastro como disponível para Edição', async () => {
    const { fetcher } = await setup('edicao', false);
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledWith('/v1/pacientes/capacidades', expect.anything()));
    expect(screen.queryByRole('link', { name: 'Cadastrar paciente' })).not.toBeInTheDocument();
  });
});
