import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Link, Outlet, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PacienteDetalheResponse } from '../../api/contracts';
import { SessionManager } from '../../app/SessionManager';
import { SessionProvider, useSession } from '../../app/session';
import { DraftProvider } from '../../shared/writing';
import FollowupPage from './FollowupPage';

const ID = '9007199254740993';
const ATTENDANCE = '9007199254740995';
const path = `/pacientes/${ID}`;
const patientPath = `${path}?limit=1&offset=0`;
const formPath = `${path}/registrar?tipo=retorno-anual&atendimentoId=${ATTENDANCE}`;
const managers: SessionManager[] = [];
const routers: ReturnType<typeof createMemoryRouter>[] = [];
const patient: PacienteDetalheResponse = {
  pacienteId: ID, nome: 'Pessoa de Acompanhamento Sintética', dataNascimento: null, sexo: null,
  idade: null, dataReferenciaIdade: '2026-10-04', raca: null, pertenceComunidadeTradicional: null,
  tipoComunidadeTradicional: null, versao: '1', endereco: null, telefones: [], atendimentos: [],
  paginacaoColecoes: { limit: 1, offset: 0 },
};

afterEach(() => {
  routers.splice(0).forEach(router => router.dispose());
  managers.splice(0).forEach(manager => manager.dispose());
});

function AuthenticatedDrafts() {
  const session = useSession();
  return <DraftProvider key={session.draftScope}><Outlet /></DraftProvider>;
}

async function setup() {
  const reads = new Map<string, () => Response | Promise<Response>>([
    [patientPath, () => Response.json(patient)],
    [`${path}/atendimentos?limit=20&offset=0`, () => Response.json([
      { atendimentoId: ATTENDANCE, dataAtendimento: '2024-02-29', localizacaoProntuario: null,
        ambulatorioUnicamente: null, ambulatorioAnexoProjeto: null, observacoes: null, versao: '1' },
    ])],
  ]);
  const write = vi.fn<() => Response | Promise<Response>>(() => Response.json({ retornoId: '201' }, { status: 201 }));
  const fetcher = vi.fn<typeof fetch>(async (url, options) => {
    const resource = String(url).replace(/^\/v1/, '');
    if (resource === '/auth/login') return Response.json({ accessToken: 'token-sintetico', tokenType: 'Bearer', expiresIn: 60 });
    if (resource === '/auth/me') return Response.json({ usuarioId: '11', nome: 'Equipe Sintética', perfil: 'edicao' });
    if (options?.method === 'POST' && resource === `${path}/retornos-anuais`) return write();
    const read = reads.get(resource);
    if (!read) throw new Error(`Resposta sintética ausente: ${resource}`);
    return read();
  });
  const manager = new SessionManager(fetcher);
  managers.push(manager);
  await manager.login('sintetico@example.invalid', 'senha-sintetica');
  const router = createMemoryRouter([{ element: <SessionProvider manager={manager}><AuthenticatedDrafts /></SessionProvider>, children: [
    { path: '/pacientes/:pacienteId/registrar', element: <FollowupPage /> },
    { path: '/pacientes/:pacienteId', element: <><p>Ficha sintética para verificação</p>
      <Link to={formPath}>Registrar novamente</Link></> },
  ] }], { initialEntries: [formPath] });
  routers.push(router);
  render(<RouterProvider router={router} />);
  await screen.findByLabelText('Resumo do retorno anual');
  const refresh = () => manager.queries.invalidateQueries({
    queryKey: ['clinical', manager.getSnapshot().generation, patientPath], exact: true,
  });
  return { manager, reads, write, fetcher, refresh, user: userEvent.setup() };
}

async function fill(user: ReturnType<typeof userEvent.setup>, summary = 'Rascunho de retorno sintético') {
  fireEvent.change(screen.getByLabelText('Data efetiva do comparecimento'), { target: { value: '2024-02-29' } });
  await user.type(screen.getByLabelText('Resumo do retorno anual'), summary);
}

describe('reconsulta do contexto de acompanhamento', () => {
  it('oculta o formulário enquanto verifica acesso, conserva o rascunho e protege a navegação', async () => {
    const { user, reads, refresh, write } = await setup();
    await fill(user);
    let finish!: (response: Response) => void;
    reads.set(patientPath, () => new Promise(resolve => { finish = resolve; }));
    let refreshed!: Promise<void>;
    act(() => { refreshed = refresh(); });
    await waitFor(() => expect(screen.getByLabelText('Resumo do retorno anual')).not.toBeVisible());
    expect(screen.getByLabelText('Resumo do retorno anual')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Salvar registro' })).not.toBeInTheDocument();
    const unload = new Event('beforeunload', { cancelable: true });
    act(() => { window.dispatchEvent(unload); });
    expect(unload.defaultPrevented).toBe(true);
    await user.click(screen.getByRole('link', { name: 'Ficha do paciente' }));
    expect(await screen.findByRole('button', { name: 'Continuar editando' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Continuar editando' }));

    await act(async () => { finish(Response.json(patient)); await refreshed; });
    expect(await screen.findByLabelText('Resumo do retorno anual')).toHaveValue('Rascunho de retorno sintético');
    expect(screen.getByLabelText('Resumo do retorno anual')).toBeVisible();
    expect(write).not.toHaveBeenCalled();
  });

  it('oculta dados anteriores após recusa de acesso e só recupera o rascunho após leitura autorizada', async () => {
    const { user, reads, refresh, write } = await setup();
    await fill(user);
    reads.set(patientPath, () => Response.json({}, { status: 403 }));
    await act(async () => { await refresh(); });
    expect(await screen.findByRole('heading', { name: 'Acesso não autorizado' })).toBeVisible();
    expect(screen.getByText(patient.nome)).not.toBeVisible();
    expect(screen.getByLabelText('Resumo do retorno anual')).not.toBeVisible();
    expect(screen.queryByRole('button', { name: 'Salvar registro' })).not.toBeInTheDocument();
    reads.set(patientPath, () => Response.json(patient));
    await act(async () => { await refresh(); });
    expect(await screen.findByLabelText('Resumo do retorno anual')).toHaveValue('Rascunho de retorno sintético');
    expect(write).not.toHaveBeenCalled();
  });

  it('mantém o comprovante e os valores salvos quando uma escrita termina durante a reconsulta', async () => {
    const { user, reads, refresh, write, fetcher } = await setup();
    await fill(user, 'Comparecimento confirmado sintético');
    let confirm!: (response: Response) => void;
    write.mockImplementation(() => new Promise(resolve => { confirm = resolve; }));
    await user.click(screen.getByRole('button', { name: 'Salvar registro' }));
    expect(screen.getByRole('button', { name: 'Salvando…' })).toBeDisabled();
    let finishRead!: (response: Response) => void;
    reads.set(patientPath, () => new Promise(resolve => { finishRead = resolve; }));
    let refreshed!: Promise<void>;
    act(() => { refreshed = refresh(); });
    await waitFor(() => expect(screen.getByLabelText('Resumo do retorno anual')).not.toBeVisible());
    await act(async () => { confirm(Response.json({ retornoId: '201' }, { status: 201 })); });
    reads.set(patientPath, () => Response.json(patient));
    await act(async () => { finishRead(Response.json(patient)); await refreshed; });
    expect(await screen.findByText('Registro salvo.')).toBeVisible();
    expect(screen.getByLabelText('Resumo do retorno anual')).toHaveValue('Comparecimento confirmado sintético');
    expect(screen.getByRole('button', { name: 'Salvar registro' })).toBeDisabled();
    expect(screen.getByText('201')).toBeVisible();
    expect(fetcher.mock.calls.filter(([url, options]) => url === `/v1${path}/retornos-anuais` && options?.method === 'POST')).toHaveLength(1);
  });
});
