import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { SessionManager } from '../../app/SessionManager';
import { SessionProvider } from '../../app/session';
import { DraftProvider } from '../../shared/writing';
import { withRegisteredOperations } from '../../test/operation-fixture';
import AttendanceFormPage from './AttendanceFormPage';

const patientPath = '/pacientes/9007199254740993';
const attendanceId = '9007199254740995';
const attendancePath = `${patientPath}/atendimentos/${attendanceId}`;
const resources: Array<{ manager: SessionManager; router: ReturnType<typeof createMemoryRouter> }> = [];
afterEach(() => resources.splice(0).forEach(({ manager, router }) => { router.dispose(); manager.dispose(); }));

async function setup(date: string | null, creation = false) {
  const writes = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => Response.json({ atendimentoId: attendanceId, versao: '4' }));
  const fetcher: typeof fetch = async (url, init) => {
    if (url === '/v1/auth/login') return Response.json({ accessToken: 'sintetico', tokenType: 'Bearer', expiresIn: 900 });
    if (url === '/v1/auth/me') return Response.json({ usuarioId: '42', nome: 'Profissional sintético', perfil: 'edicao' });
    if (init?.method === 'PATCH' || init?.method === 'POST') return writes(url, init);
    if (url === `/v1${patientPath}`) return Response.json({ pacienteId: '9007199254740993', nome: 'Paciente sintético' });
    if (url === `/v1${attendancePath}`) return Response.json({ atendimentoId: attendanceId, dataAtendimento: date,
      versao: '3', localizacaoProntuario: null, ambulatorioUnicamente: null, ambulatorioAnexoProjeto: null,
      observacoes: null, dadosClinicos: null, diagnosticoChagas: null, exames: [], pendencias: [],
      rastreioFamiliar: null, rastreiosFamiliares: [], paginacaoColecoes: { limit: 20, offset: 0 } });
    throw new Error(`Rota sintética inesperada: ${url}`);
  };
  const manager = new SessionManager(withRegisteredOperations(fetcher));
  await manager.login('sintetico@example.invalid', 'senha-sintetica');
  const router = createMemoryRouter([{ element: <SessionProvider manager={manager}><DraftProvider><AttendanceFormPage /></DraftProvider></SessionProvider>,
    path: creation ? '/pacientes/:pacienteId/atendimentos/novo' : '/pacientes/:pacienteId/atendimentos/:atendimentoId/editar' },
  { path: '/pacientes/:pacienteId/atendimentos/:atendimentoId', element: <p>Detalhe salvo</p> }],
  { initialEntries: [creation ? `${patientPath}/atendimentos/novo` : `${attendancePath}/editar`] });
  resources.push({ manager, router });
  render(<RouterProvider router={router} />);
  await screen.findByLabelText('Data do atendimento');
  return { user: userEvent.setup(), writes };
}

describe('edição de atendimento legado com data desconhecida', () => {
  it('permite corrigir observações sem preencher, estimar ou enviar data', async () => {
    const { user, writes } = await setup(null);
    expect(screen.getByLabelText('Data do atendimento')).not.toBeRequired();
    expect(screen.getByText(/A data deste atendimento legado é desconhecida/)).toBeVisible();
    await user.type(screen.getByLabelText('Observações do atendimento'), 'Correção sintética');
    await user.click(screen.getByRole('button', { name: 'Salvar atendimento' }));
    await waitFor(() => expect(writes).toHaveBeenCalledTimes(1));
    const [url, init] = writes.mock.calls[0]!;
    expect(url).toBe(`/v1${attendancePath}`);
    expect(init?.method).toBe('PATCH');
    expect(JSON.parse(String(init?.body))).toEqual({ versao: '3', observacoes: 'Correção sintética' });
    expect(await screen.findByText('Detalhe salvo')).toBeVisible();
  });
  it.each([false, true])('mantém data obrigatória quando criação=%s e bloqueia envio com data vazia', async creation => {
    const { user, writes } = await setup('2020-01-01', creation);
    const date = screen.getByLabelText('Data do atendimento');
    expect(date).toBeRequired();
    if (!creation) await user.clear(date);
    await user.type(screen.getByLabelText('Observações do atendimento'), 'Correção sintética');
    await user.click(screen.getByRole('button', { name: creation ? 'Próxima etapa' : 'Salvar atendimento' }));
    expect(writes).not.toHaveBeenCalled();
    if (creation) expect(screen.getByRole('status')).toHaveTextContent('Etapa 1 de 5: Atendimento');
    expect(date).toBeRequired();
  });
});
