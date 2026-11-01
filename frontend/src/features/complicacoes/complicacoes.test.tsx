import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, Outlet, RouterProvider, useLocation } from 'react-router';
import { SessionManager } from '../../app/SessionManager';
import { SessionProvider } from '../../app/session';
import { DraftProvider } from '../../shared/writing';
import type { ComplicacaoResponse } from '../../api/contracts';
import { withRegisteredOperations } from '../../test/operation-fixture';
import ComplicacoesPage from './ComplicacoesPage';
import ComplicacaoCreatePage from './ComplicacaoCreatePage';
import { complicacaoValue } from './complicacao-model';

const patientPath = '/pacientes/9007199254740993';
const attendancePath = `${patientPath}/atendimentos/9007199254740994`;
const path = `${attendancePath}/complicacoes-chagas`;
const createdId = '9007199254740996';
const source = `${attendancePath}?limit=10&offset=20&retorno=${encodeURIComponent(`${patientPath}?aba=atendimentos&offset=40`)}`;
const list = `${path}?complicacoesLimit=20&complicacoesOffset=0&retorno=${encodeURIComponent(source)}`;
const creation = `${path}/nova?retorno=${encodeURIComponent(list)}`;
const sessions: Array<{ manager: SessionManager; router: ReturnType<typeof createMemoryRouter> }> = [];
afterEach(() => sessions.splice(0).forEach(({ manager, router }) => { router.dispose(); manager.dispose(); }));

function episode(id = createdId): ComplicacaoResponse {
  return { complicacaoChagasId: id, atendimentoId: '9007199254740994', tipoComplicacao: 'Tipo livre sintético',
    possuiComplicacao: false, descricao: 'Relato sintético', gravidade: 'nao_informado' };
}

function Location() { const location = useLocation(); return <output data-testid="location">{location.pathname}{location.search}</output>; }
async function setup({ start = creation, profile = 'edicao', rows = [] as ComplicacaoResponse[] } = {}) {
  const state = { contextStatus: 200, listStatus: 200, rows, uncertain: false };
  let intention: Record<string, unknown> = {};
  const writes = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => {
    if (state.uncertain) throw new TypeError('network failure');
    return Response.json({ complicacaoChagasId: createdId }, { status: 201 });
  });
  const fetcher: typeof fetch = async (url, init) => {
    if (url === '/v1/auth/login') return Response.json({ accessToken: 'sintetico', tokenType: 'Bearer', expiresIn: 900 });
    if (url === '/v1/auth/me') return Response.json({ usuarioId: '42', nome: 'Profissional sintético', perfil: profile });
    if (url === `/v1${attendancePath}`) return Response.json({ atendimentoId: '9007199254740994' }, { status: state.contextStatus });
    if (url === `/v1${patientPath}`) return Response.json({ pacienteId: '9007199254740993' });
    if (String(url).startsWith('/v1/operacoes/')) return Response.json({ ...intention, estado: 'confirmada',
      resultado: { complicacaoChagasId: createdId }, expiraEm: '2099-01-01T00:00:00.000Z' });
    if (url === `/v1${path}` && init?.method === 'POST') return writes(url, init);
    if (String(url).startsWith(`/v1${path}?`)) {
      const params = new URL(String(url), 'http://app.local').searchParams;
      const offset = Number(params.get('offset'));
      return Response.json(state.rows.slice(offset, offset + Number(params.get('limit'))), { status: state.listStatus });
    }
    throw new Error(`Rota sintética inesperada: ${url}`);
  };
  const registered = withRegisteredOperations(fetcher);
  const manager = new SessionManager((url, init) => {
    if (url === '/v1/operacoes' && init?.method === 'POST') intention = JSON.parse(String(init.body));
    return registered(url, init);
  });
  await manager.login('sintetico@example.invalid', 'senha-sintetica');
  const router = createMemoryRouter([{ element: <SessionProvider manager={manager}><DraftProvider><Location /><Outlet /></DraftProvider></SessionProvider>,
    children: [{ element: <ComplicacoesPage />, path: '/pacientes/:pacienteId/atendimentos/:atendimentoId/complicacoes-chagas' },
      { element: <ComplicacaoCreatePage />, path: '/pacientes/:pacienteId/atendimentos/:atendimentoId/complicacoes-chagas/nova' },
      { path: '/pacientes/:pacienteId/atendimentos/:atendimentoId', element: <p>Atendimento de origem</p> }] }], { initialEntries: [start] });
  sessions.push({ manager, router });
  render(<RouterProvider router={router} />);
  return { user: userEvent.setup(), writes, state, manager, router };
}

describe('complicações repetíveis', () => {
  it('revisa quatro campos, conserva descrição após Não e confirma uma ocorrência sem apagar recibos', async () => {
    const { user, writes } = await setup();
    await user.type(await screen.findByLabelText('Tipo de complicação'), 'Tipo livre sintético');
    await user.type(screen.getByLabelText('Descrição da complicação'), '  Relato independente  ');
    await user.selectOptions(screen.getByLabelText('Possui complicação'), 'sim');
    await user.selectOptions(screen.getByLabelText('Possui complicação'), 'nao');
    await user.selectOptions(screen.getByLabelText('Gravidade da complicação'), 'nao_informado');
    fireEvent.submit(screen.getByRole('form', { name: 'Registrar complicação' }));
    expect(writes).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Revisar complicação' }));
    expect(screen.getByRole('heading', { name: 'Revisão da complicação' })).toHaveFocus();
    const summary = screen.getByRole('region', { name: 'Resumo da complicação' });
    expect(within(summary).getAllByRole('term')).toHaveLength(4);
    expect(within(summary).getByText('Não', { exact: true })).toBeVisible();
    expect(within(summary).getByText('Não informado (registrado)')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Voltar aos campos' }));
    expect(screen.getByLabelText('Descrição da complicação')).toHaveValue('  Relato independente  ');
    await user.click(screen.getByRole('button', { name: 'Revisar complicação' }));
    const form = screen.getByRole('form', { name: 'Registrar complicação' });
    fireEvent.submit(form); fireEvent.submit(form);
    await waitFor(() => expect(writes).toHaveBeenCalledTimes(1));
    expect(JSON.parse(String(writes.mock.calls[0]![1]?.body))).toEqual({ tipoComplicacao: 'Tipo livre sintético',
      possuiComplicacao: false, descricao: '  Relato independente  ', gravidade: 'nao_informado' });
    expect(await screen.findByRole('heading', { name: `Complicação confirmada ${createdId}` })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Registrar outro episódio' }));
    expect(screen.getByLabelText('Tipo de complicação')).toHaveValue('');
    expect(screen.getByRole('heading', { name: `Complicação confirmada ${createdId}` })).toBeVisible();
  });

  it('registra desconhecimento explícito sem converter para negativo ou não informado', async () => {
    const { user, writes } = await setup();
    await screen.findByLabelText('Tipo de complicação');
    await user.click(screen.getByRole('button', { name: 'Revisar complicação' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar complicação' }));
    await waitFor(() => expect(writes).toHaveBeenCalledOnce());
    expect(JSON.parse(String(writes.mock.calls[0]![1]?.body))).toEqual({ tipoComplicacao: null,
      possuiComplicacao: null, descricao: null, gravidade: null });
    expect(complicacaoValue('possuiComplicacao', false)).toBe('Não');
    expect(complicacaoValue('possuiComplicacao', null)).toBe('Desconhecido / não registrado');
  });

  it('bloqueia intenção incerta e recupera recibo sem outro POST', async () => {
    const { user, writes, state } = await setup(); state.uncertain = true;
    await user.type(await screen.findByLabelText('Descrição da complicação'), 'Rascunho sintético');
    await user.click(screen.getByRole('button', { name: 'Revisar complicação' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar complicação' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível confirmar/i);
    expect(screen.getByRole('button', { name: 'Confirmar complicação' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Verificar resultado do envio' }));
    expect(await screen.findByRole('heading', { name: `Complicação confirmada ${createdId}` })).toBeVisible();
    expect(writes).toHaveBeenCalledOnce();
  });

  it('consulta não oferece criação e erro de leitura não conserva dados anteriores', async () => {
    const { manager, state } = await setup({ start: list, profile: 'consulta', rows: [episode()] });
    expect(await screen.findByText('Tipo livre sintético')).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Registrar complicação' })).not.toBeInTheDocument();
    state.listStatus = 403;
    await act(async () => { await manager.queries.invalidateQueries({ queryKey: ['clinical'], refetchType: 'active' }); });
    expect(await screen.findByRole('heading', { name: 'Acesso não autorizado' })).toBeVisible();
    expect(screen.queryByText('Tipo livre sintético')).not.toBeInTheDocument();
  });
});
