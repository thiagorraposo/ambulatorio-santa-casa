import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router';
import { SessionManager } from '../../app/SessionManager';
import { SessionProvider } from '../../app/session';
import type { CondicaoChagasResponse } from '../../api/contracts';
import { DraftProvider } from '../../shared/writing';
import { withRegisteredOperations } from '../../test/operation-fixture';
import CondicaoPage from './CondicaoPage';
import CondicaoCreatePage from './CondicaoCreatePage';

const patientPath = '/pacientes/9007199254740993';
const attendancePath = `${patientPath}/atendimentos/9007199254740994`;
const path = `${attendancePath}/condicao-chagas`;
const createdId = '9007199254740996';
const source = `${attendancePath}?limit=10&offset=20`;
const reading = `${path}?retorno=${encodeURIComponent(source)}`;
const creation = `${path}/nova?retorno=${encodeURIComponent(reading)}`;
const sessions: Array<{ manager: SessionManager; router: ReturnType<typeof createMemoryRouter> }> = [];
afterEach(() => sessions.splice(0).forEach(({ manager, router }) => { router.dispose(); manager.dispose(); }));

const condition = (): CondicaoChagasResponse => ({ condicaoChagasId: createdId, atendimentoId: '9007199254740994',
  formaClinica: 'nao_informado', faseDoenca: null, classificacaoClinica: '', possuiSintomas: false,
  descricaoSintomas: 'Descrição sintética independente do indicador', observacoes: 'Observação sintética discriminante' });

async function setup({ start = creation, profile = 'edicao', record = null as CondicaoChagasResponse | null } = {}) {
  const state = { contextStatus: 200, readStatus: 200, record, uncertain: false };
  let intention: Record<string, unknown> = {};
  const writes = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => {
    if (state.uncertain) throw new TypeError('network failure');
    return Response.json({ condicaoChagasId: createdId }, { status: 201 });
  });
  const fetcher: typeof fetch = async (url, init) => {
    if (url === '/v1/auth/login') return Response.json({ accessToken: 'sintetico', tokenType: 'Bearer', expiresIn: 900 });
    if (url === '/v1/auth/me') return Response.json({ usuarioId: '42', nome: 'Profissional sintético', perfil: profile });
    if (url === `/v1${attendancePath}`) return Response.json({ atendimentoId: '9007199254740994' }, { status: state.contextStatus });
    if (String(url).startsWith('/v1/operacoes/')) return Response.json({ ...intention, estado: 'confirmada',
      resultado: { condicaoChagasId: createdId }, expiraEm: '2099-01-01T00:00:00.000Z' });
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
    children: [{ element: <CondicaoPage />, path: '/pacientes/:pacienteId/atendimentos/:atendimentoId/condicao-chagas' },
      { element: <CondicaoCreatePage />, path: '/pacientes/:pacienteId/atendimentos/:atendimentoId/condicao-chagas/nova' },
      { path: '/pacientes/:pacienteId/atendimentos/:atendimentoId', element: <p>Atendimento de origem</p> }] }], { initialEntries: [start] });
  sessions.push({ manager, router });
  render(<RouterProvider router={router} />);
  return { user: userEvent.setup(), writes, state, manager, router };
}

async function review(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Revisar condição' }));
  expect(screen.getByRole('heading', { name: 'Revisão da condição de Chagas' })).toHaveFocus();
  return screen.getByRole('region', { name: 'Resumo da condição' });
}

describe('condição de Chagas por atendimento', () => {
  it('revisa seis campos, corrige isoladamente e confirma uma vez preservando false, null e texto literal', async () => {
    const { user, writes } = await setup();
    await user.selectOptions(await screen.findByLabelText('Forma clínica'), 'nao_informado');
    await user.selectOptions(screen.getByLabelText('Possui sintomas'), 'nao');
    await user.type(screen.getByLabelText('Descrição de sintomas'), '  Relato sintético independente  ');
    await user.type(screen.getByLabelText('Observações da condição'), 'Primeira observação');
    fireEvent.submit(screen.getByRole('form', { name: 'Registrar condição de Chagas' }));
    expect(writes).not.toHaveBeenCalled();
    const summary = await review(user);
    expect(within(summary).getAllByRole('term')).toHaveLength(6);
    expect(within(summary).getByText('Não informado (registrado)')).toBeVisible();
    expect(within(summary).getByText('Não', { exact: true })).toBeVisible();
    expect(within(summary).getAllByText('Desconhecido / não registrado')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Voltar aos campos' }));
    await user.clear(screen.getByLabelText('Observações da condição'));
    await user.type(screen.getByLabelText('Observações da condição'), 'Observação corrigida');
    expect(screen.getByLabelText('Possui sintomas')).toHaveValue('nao');
    expect(screen.getByLabelText('Descrição de sintomas')).toHaveValue('  Relato sintético independente  ');
    await review(user);
    const form = screen.getByRole('form', { name: 'Registrar condição de Chagas' });
    fireEvent.submit(form); fireEvent.submit(form);
    await waitFor(() => expect(writes).toHaveBeenCalledTimes(1));
    expect(JSON.parse(String(writes.mock.calls[0]![1]?.body))).toEqual({ formaClinica: 'nao_informado', faseDoenca: null,
      classificacaoClinica: null, possuiSintomas: false, descricaoSintomas: '  Relato sintético independente  ',
      observacoes: 'Observação corrigida' });
    expect(await screen.findByRole('heading', { name: `Condição confirmada ${createdId}` })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Confirmar condição' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Registrar outr/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Descartar rascunho' })).not.toBeInTheDocument();
  });

  it('permite registrar desconhecimento explícito sem criar valores negativos', async () => {
    const { user, writes } = await setup();
    await screen.findByLabelText('Forma clínica');
    const summary = await review(user);
    expect(within(summary).getAllByText('Desconhecido / não registrado')).toHaveLength(6);
    await user.click(screen.getByRole('button', { name: 'Confirmar condição' }));
    await waitFor(() => expect(writes).toHaveBeenCalledTimes(1));
    expect(JSON.parse(String(writes.mock.calls[0]![1]?.body))).toEqual({ formaClinica: null, faseDoenca: null,
      classificacaoClinica: null, possuiSintomas: null, descricaoSintomas: null, observacoes: null });
  });

  it('mantém rascunho ao sair, exige confirmação de descarte e restaura foco com Escape', async () => {
    const { user, writes } = await setup();
    await user.type(await screen.findByLabelText('Classificação clínica'), 'Classificação sintética');
    await user.click(screen.getByRole('link', { name: '← Voltar à condição' }));
    const dialog = await screen.findByRole('dialog', { name: 'Alterações não salvas' });
    await user.click(within(dialog).getByRole('button', { name: 'Sair e manter rascunho' }));
    await user.click(await screen.findByRole('link', { name: 'Registrar condição de Chagas' }));
    expect(await screen.findByLabelText('Classificação clínica')).toHaveValue('Classificação sintética');
    const discard = screen.getByRole('button', { name: 'Descartar rascunho' });
    await user.click(discard);
    expect(screen.getByRole('button', { name: 'Continuar editando' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(discard).toHaveFocus();
    expect(screen.getByLabelText('Classificação clínica')).toHaveValue('Classificação sintética');
    await user.click(discard);
    await user.click(screen.getByRole('button', { name: 'Confirmar descarte do rascunho' }));
    expect(screen.getByLabelText('Classificação clínica')).toHaveValue('');
    await user.click(screen.getByRole('link', { name: '← Voltar à condição' }));
    expect(await screen.findByText('Nenhuma condição registrada neste atendimento.')).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(writes).not.toHaveBeenCalled();
  });

  it('recupera recibo incerto pela intenção sem outro envio', async () => {
    const { user, state, writes } = await setup();
    state.uncertain = true;
    await user.type(await screen.findByLabelText('Descrição de sintomas'), 'Rascunho da intenção sintética');
    await review(user);
    await user.click(screen.getByRole('button', { name: 'Confirmar condição' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível confirmar/i);
    expect(screen.getByRole('button', { name: 'Confirmar condição' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Voltar aos campos' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Verificar resultado do envio' }));
    expect(await screen.findByRole('heading', { name: `Condição confirmada ${createdId}` })).toBeVisible();
    expect(screen.getByText('Rascunho da intenção sintética')).toBeVisible();
    expect(writes).toHaveBeenCalledTimes(1);
  });

  it('oculta formulário após recusa e preserva rascunho ao recuperar leitura autorizada', async () => {
    const { user, manager, state, writes } = await setup();
    await user.type(await screen.findByLabelText('Descrição de sintomas'), 'Rascunho protegido sintético');
    state.contextStatus = 403;
    await act(async () => { await manager.queries.invalidateQueries({ queryKey: ['clinical'], refetchType: 'active' }); });
    expect(await screen.findByRole('heading', { name: 'Acesso não autorizado' })).toBeVisible();
    expect(screen.getByLabelText('Descrição de sintomas')).not.toBeVisible();
    expect(screen.getByLabelText('Descrição de sintomas')).toBeDisabled();
    state.contextStatus = 200;
    await act(async () => { await manager.queries.invalidateQueries({ queryKey: ['clinical'], refetchType: 'active' }); });
    await waitFor(() => expect(screen.getByLabelText('Descrição de sintomas')).toBeVisible());
    expect(screen.getByLabelText('Descrição de sintomas')).toHaveValue('Rascunho protegido sintético');
    expect(writes).not.toHaveBeenCalled();
  });

  it('consulta distingue ausência de registro e não recebe criação nem por URL direta', async () => {
    const { router, writes } = await setup({ start: reading, profile: 'consulta' });
    expect(await screen.findByText('Nenhuma condição registrada neste atendimento.')).toBeVisible();
    expect(screen.getByRole('link', { name: '← Voltar ao atendimento de origem' })).toHaveAttribute('href', source);
    expect(screen.queryByRole('link', { name: 'Registrar condição de Chagas' })).not.toBeInTheDocument();
    await act(async () => { await router.navigate(creation); });
    expect(await screen.findByRole('heading', { name: 'Acesso de consulta' })).toBeVisible();
    expect(screen.queryByLabelText('Forma clínica')).not.toBeInTheDocument();
    expect(writes).not.toHaveBeenCalled();
  });

  it('lê null, false, texto vazio e não informado sem oferecer segunda condição', async () => {
    const { writes } = await setup({ start: reading, record: condition() });
    expect(await screen.findByRole('heading', { name: `Condição ${createdId}` })).toBeVisible();
    expect(screen.getByText('Não informado (registrado)')).toBeVisible();
    expect(screen.getByText('Desconhecido / não registrado')).toBeVisible();
    expect(screen.getByText('Não', { exact: true })).toBeVisible();
    expect(screen.getByText('Texto vazio')).toBeVisible();
    expect(screen.getByText('Descrição sintética independente do indicador')).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Registrar condição de Chagas' })).not.toBeInTheDocument();
    expect(writes).not.toHaveBeenCalled();
  });

  it('não mantém condição anterior após erro de leitura do recurso', async () => {
    const { manager, state, writes } = await setup({ start: reading, record: condition() });
    await screen.findByText('Observação sintética discriminante');
    state.readStatus = 403;
    await act(async () => { await manager.queries.invalidateQueries({ queryKey: ['clinical'], refetchType: 'active' }); });
    expect(await screen.findByRole('heading', { name: 'Acesso não autorizado' })).toBeVisible();
    expect(screen.queryByText('Observação sintética discriminante')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Registrar condição de Chagas' })).not.toBeInTheDocument();
    expect(writes).not.toHaveBeenCalled();
  });
});
