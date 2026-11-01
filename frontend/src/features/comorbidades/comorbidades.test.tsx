import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router';
import { SessionManager } from '../../app/SessionManager';
import { SessionProvider } from '../../app/session';
import type { AvaliacaoComorbidadesResponse } from '../../api/contracts';
import { DraftProvider } from '../../shared/writing';
import { withRegisteredOperations } from '../../test/operation-fixture';
import ComorbidadesPage from './ComorbidadesPage';
import ComorbidadesCreatePage from './ComorbidadesCreatePage';

const patientPath = '/pacientes/9007199254740993';
const attendancePath = `${patientPath}/atendimentos/9007199254740994`;
const path = `${attendancePath}/comorbidades`;
const createdId = '9007199254740996';
const source = `${attendancePath}?limit=10&offset=20`;
const reading = `${path}?retorno=${encodeURIComponent(source)}`;
const creation = `${path}/nova?retorno=${encodeURIComponent(reading)}`;
const sessions: Array<{ manager: SessionManager; router: ReturnType<typeof createMemoryRouter> }> = [];
afterEach(() => sessions.splice(0).forEach(({ manager, router }) => { router.dispose(); manager.dispose(); }));

const record = (): AvaliacaoComorbidadesResponse => ({ avaliacaoComorbidadesId: createdId,
  atendimentoId: '9007199254740994', itens: [{ itemId: '8', comorbidadeId: '7', nomeComorbidade: 'Hipertensão sintética',
    possuiComorbidade: false, observacoes: 'Texto preservado' }], historicoFamiliar: { possuiDoenca: null, descricao: null } });
async function setup({ start = creation, profile = 'edicao', record = null as AvaliacaoComorbidadesResponse | null } = {}) {
  const state = { contextStatus: 200, readStatus: 200, record, uncertain: false };
  let intention: Record<string, unknown> = {};
  const writes = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => {
    if (state.uncertain) throw new TypeError('network failure');
    return Response.json({ avaliacaoComorbidadesId: createdId }, { status: 201 });
  });
  const fetcher: typeof fetch = async (url, init) => {
    if (url === '/v1/auth/login') return Response.json({ accessToken: 'sintetico', tokenType: 'Bearer', expiresIn: 900 });
    if (url === '/v1/auth/me') return Response.json({ usuarioId: '42', nome: 'Profissional sintético', perfil: profile });
    if (String(url).startsWith('/v1/catalogos/comorbidades?')) return Response.json([{ id: '7', nome: 'Hipertensão sintética', ativo: true }, { id: '9', nome: 'Diabetes sintética', ativo: true }]);
    if (url === `/v1${attendancePath}`) return Response.json({ atendimentoId: '9007199254740994' }, { status: state.contextStatus });
    if (String(url).startsWith('/v1/operacoes/')) return Response.json({ ...intention, estado: 'confirmada',
      resultado: { avaliacaoComorbidadesId: createdId }, expiraEm: '2099-01-01T00:00:00.000Z' });
    if (url === `/v1${path}` && init?.method === 'POST') return writes(url, init);
    if (url === `/v1${path}`) return Response.json(state.record, { status: state.readStatus });
    throw new Error(`Rota sintética inesperada: ${url}`);
  };
  const registered = withRegisteredOperations(fetcher);
  const manager = new SessionManager((url, init) => {
    if (url === '/v1/operacoes' && init?.method === 'POST') intention = JSON.parse(String(init.body));
    return registered(url, init);
  });
  await manager.login('sintetico@example.invalid', 'senha-sintetica');
  const router = createMemoryRouter([{ element: <SessionProvider manager={manager}><DraftProvider><Outlet /></DraftProvider></SessionProvider>,
    children: [{ element: <ComorbidadesPage />, path: '/pacientes/:pacienteId/atendimentos/:atendimentoId/comorbidades' },
      { element: <ComorbidadesCreatePage />, path: '/pacientes/:pacienteId/atendimentos/:atendimentoId/comorbidades/nova' },
      { path: '/pacientes/:pacienteId/atendimentos/:atendimentoId', element: <p>Atendimento de origem</p> }] }], { initialEntries: [start] });
  sessions.push({ manager, router });
  render(<RouterProvider router={router} />);
  return { user: userEvent.setup(), writes, state, manager, router };
}

describe('avaliação de comorbidades por consulta', () => {
  it('exige escolha explícita, revisa negativa/desconhecido e envia apenas os itens avaliados', async () => {
    const { user, writes } = await setup();
    await screen.findByLabelText('Avaliar Hipertensão sintética');
    await user.click(screen.getByRole('button', { name: 'Revisar comorbidades' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Selecione uma comorbidade');
    await user.click(screen.getByLabelText('Avaliar Hipertensão sintética'));
    await user.selectOptions(screen.getByLabelText('Presença de Hipertensão sintética'), 'nao');
    await user.type(screen.getByLabelText('Observações de Hipertensão sintética'), '  Texto literal  ');
    await user.selectOptions(screen.getByLabelText('Histórico de doença familiar'), 'desconhecido');
    await user.type(screen.getByLabelText('Relato familiar'), 'Relato independente');
    await user.click(screen.getByRole('button', { name: 'Revisar comorbidades' }));
    expect(screen.getByRole('heading', { name: 'Revisão das comorbidades' })).toHaveFocus();
    const summary = screen.getByRole('region', { name: 'Resumo das comorbidades' });
    expect(within(summary).getByText('Não', { exact: true })).toBeVisible();
    expect(within(summary).getByText('Desconhecido (registrado)', { exact: true })).toBeVisible();
    expect(within(summary).queryByText('Diabetes sintética')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmar comorbidades' }));
    await screen.findByRole('heading', { name: `Avaliação confirmada ${createdId}` });
    expect(writes).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(writes.mock.calls[0]![1]?.body))).toEqual({ itens: [{ comorbidadeId: '7', possuiComorbidade: false,
      observacoes: '  Texto literal  ' }], historicoFamiliar: { possuiDoenca: null, descricao: 'Relato independente' } });
  });
  it('mostra histórico e perfil consulta sem habilitar escrita, ocultando leitura quando falha', async () => {
    const { user, state, router } = await setup({ start: reading, profile: 'consulta', record: record() });
    await screen.findByRole('heading', { name: `Avaliação ${createdId}` });
    expect(screen.getByText('Texto preservado')).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Registrar comorbidades' })).not.toBeInTheDocument();
    state.readStatus = 503;
    await act(async () => { await router.navigate(creation); });
    expect(await screen.findByRole('heading', { name: 'Acesso de consulta' })).toBeVisible();
    await user.click(screen.getByRole('link', { name: /Voltar às comorbidades/ }));
    expect(await screen.findByRole('alert')).toBeVisible();
    expect(screen.queryByText('Texto preservado')).not.toBeInTheDocument();
  });
  it('recupera confirmação incerta sem repetir POST', async () => {
    const { user, writes, state } = await setup();
    await user.click(await screen.findByLabelText('Avaliar Diabetes sintética'));
    await user.click(screen.getByRole('button', { name: 'Revisar comorbidades' }));
    state.uncertain = true;
    await user.click(screen.getByRole('button', { name: 'Confirmar comorbidades' }));
    await screen.findByRole('button', { name: 'Verificar resultado do envio' });
    await user.click(screen.getByRole('button', { name: 'Verificar resultado do envio' }));
    await screen.findByRole('heading', { name: `Avaliação confirmada ${createdId}` });
    expect(writes).toHaveBeenCalledTimes(1);
  });
});
