import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SessionManager } from '../../app/SessionManager';
import { SessionProvider } from '../../app/session';
import { DraftProvider } from '../../shared/writing';
import { withRegisteredOperations } from '../../test/operation-fixture';
import AttendanceFormPage from './AttendanceFormPage';

const managers: SessionManager[] = [];
const routers: ReturnType<typeof createMemoryRouter>[] = [];
afterEach(() => { routers.splice(0).forEach(router => router.dispose()); managers.splice(0).forEach(manager => manager.dispose()); });
async function setup(perfil = 'edicao') {
  const write = vi.fn(async () => Response.json({ message: 'SQL privado', errors: [
    { path: 'dadosClinicos.pesoKg', code: 'number', message: 'segredo' },
    { path: 'exames.29.resultado', code: 'SQL privado' },
  ] }, { status: 400 }));
  const fetcher: typeof fetch = async (url, init) => {
    if (url === '/v1/auth/login') return Response.json({ accessToken: 'sintetico', tokenType: 'Bearer', expiresIn: 60 });
    if (url === '/v1/auth/me') return Response.json({ usuarioId: '1', nome: 'Equipe Sintética', perfil });
    if (init?.method === 'POST') return write();
    return Response.json({ pacienteId: '42', nome: 'Pessoa Sintética' });
  };
  const manager = new SessionManager(withRegisteredOperations(fetcher)); managers.push(manager);
  await manager.login('sintetico@example.invalid', 'senha-sintetica');
  const router = createMemoryRouter([{ path: '/pacientes/:pacienteId/atendimentos/novo',
    element: <SessionProvider manager={manager}><DraftProvider><AttendanceFormPage /></DraftProvider></SessionProvider> }],
  { initialEntries: ['/pacientes/42/atendimentos/novo'] });
  routers.push(router); render(<RouterProvider router={router} />);
  const user = userEvent.setup();
  if (perfil !== 'consulta') {
    fireEvent.change(await screen.findByLabelText('Data do atendimento'), { target: { value: '2026-02-01' } });
    await user.type(screen.getByLabelText('Observações do atendimento'), 'Rascunho sintético');
  }
  return { user, write };
}
async function review(user: ReturnType<typeof userEvent.setup>) {
  for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: 'Próxima etapa' }));
  await user.click(screen.getByRole('button', { name: 'Revisar atendimento' }));
}
describe('feedback de campo do atendimento', () => {
  it('explica o contexto na primeira etapa sem enviar, com links, foco e valores preservados', async () => {
    const { user, write } = await setup();
    await user.selectOptions(screen.getByLabelText('Somente ambulatório'), 'sim');
    await user.selectOptions(screen.getByLabelText('Ambulatório anexo a projeto'), 'sim');
    await user.click(screen.getByRole('button', { name: 'Próxima etapa' }));
    const alert = screen.getByRole('alert');
    expect(alert).toHaveFocus();
    expect(alert).toHaveTextContent('não podem ser Sim ao mesmo tempo');
    const only = screen.getByLabelText('Somente ambulatório');
    expect(only).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById(only.getAttribute('aria-describedby')!)).toHaveTextContent('não podem ser Sim');
    await user.click(screen.getByRole('link', { name: /^Ambulatório anexo a projeto:/ }));
    await waitFor(() => expect(screen.getByLabelText('Ambulatório anexo a projeto')).toHaveFocus());
    expect(only).toHaveValue('sim');
    expect(screen.getByLabelText('Observações do atendimento')).toHaveValue('Rascunho sintético');
    expect(write).not.toHaveBeenCalled();
    await user.selectOptions(screen.getByLabelText('Ambulatório anexo a projeto'), '');
    await review(user);
    expect(screen.getByRole('heading', { name: /^Revisão$/ })).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('leva do resumo de rejeição HTTP à etapa correta sem apagar o rascunho nem reenviar', async () => {
    const { user, write } = await setup();
    await review(user);
    await user.click(screen.getByRole('button', { name: 'Confirmar atendimento' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveFocus();
    expect(alert).not.toHaveTextContent(/SQL|segredo/);
    await user.click(screen.getByRole('link', { name: /^Peso \(kg\):/ }));
    const weight = screen.getByLabelText('Peso (kg)');
    await waitFor(() => expect(weight).toHaveFocus());
    expect(weight).toBeVisible(); expect(weight).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById(weight.getAttribute('aria-describedby')!)).toHaveTextContent('até duas casas decimais');
    expect(screen.getByLabelText('Observações do atendimento')).toHaveValue('Rascunho sintético');
    expect(write).toHaveBeenCalledTimes(1);
  });
  it('associa a incompatibilidade de resolução ao status e mantém data e descrição', async () => {
    const { user, write } = await setup();
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: 'Próxima etapa' }));
    await user.click(screen.getByRole('button', { name: 'Adicionar pendência' }));
    await user.type(screen.getByLabelText('Descrição da pendência 1'), 'Pendência sintética');
    await user.selectOptions(screen.getByLabelText('Status da pendência 1'), 'aberta');
    fireEvent.change(screen.getByLabelText('Data de resolução da pendência 1'), { target: { value: '2026-02-01' } });
    await user.click(screen.getByRole('button', { name: 'Revisar atendimento' }));
    expect(screen.getByRole('alert')).toHaveFocus();
    expect(screen.getByLabelText('Status da pendência 1')).toHaveAttribute('aria-invalid', 'true');
    await user.click(screen.getByRole('link', { name: /^Status da pendência 1:/ }));
    await waitFor(() => expect(screen.getByLabelText('Status da pendência 1')).toHaveFocus());
    expect(screen.getByLabelText('Data de resolução da pendência 1')).toHaveValue('2026-02-01');
    expect(screen.getByLabelText('Descrição da pendência 1')).toHaveValue('Pendência sintética');
    expect(write).not.toHaveBeenCalled();
    await user.selectOptions(screen.getByLabelText('Status da pendência 1'), 'resolvida');
    await user.click(screen.getByRole('button', { name: 'Revisar atendimento' }));
    expect(screen.getByRole('heading', { name: /^Revisão$/ })).toBeVisible();
  });
  it('preserva o bloqueio de escrita para Consulta', async () => {
    const { write } = await setup('consulta');
    expect(await screen.findByRole('heading', { name: 'Acesso de consulta' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Confirmar atendimento' })).not.toBeInTheDocument();
    expect(write).not.toHaveBeenCalled();
  });
});
