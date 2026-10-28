import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, Outlet, RouterProvider, useLocation } from 'react-router';
import { SessionManager } from '../../app/SessionManager';
import { SessionProvider } from '../../app/session';
import { DraftProvider } from '../../shared/writing';
import type { SorologiaResponse } from '../../api/contracts';
import { withRegisteredOperations } from '../../test/operation-fixture';
import SorologiasPage from './SorologiasPage';
import SorologiaCreatePage from './SorologiaCreatePage';
import { emptySorologia, sameResourceReturn, sorologiaBody, sorologiaValue } from './sorologia-model';

const patientPath = '/pacientes/9007199254740993';
const attendancePath = `${patientPath}/atendimentos/9007199254740994`;
const path = `${attendancePath}/sorologias`;
const createdId = '9007199254740996';
const source = `${attendancePath}?limit=10&offset=20&retorno=${encodeURIComponent(`${patientPath}?aba=atendimentos&offset=40`)}`;
const list = `${path}?sorologiasLimit=20&sorologiasOffset=0&retorno=${encodeURIComponent(source)}`;
const creation = `${path}/nova?retorno=${encodeURIComponent(list)}`;
const sessions: Array<{ manager: SessionManager; router: ReturnType<typeof createMemoryRouter> }> = [];
afterEach(() => sessions.splice(0).forEach(({ manager, router }) => { router.dispose(); manager.dispose(); }));

function episode(id = createdId): SorologiaResponse {
  return { sorologiaId: id, diagnosticoChagasId: '9007199254740995', atendimentoId: '9007199254740994',
    metodoSorologico: 'Método sintético repetido', dataSolicitacao: '2026-04-10', dataColeta: '2026-04-01',
    dataResultado: null, resultado: 'nao_informado', laboratorio: null, observacoes: 'Texto sintético da observação' };
}

function Location() { const location = useLocation(); return <output data-testid="location">{location.pathname}{location.search}</output>; }
async function setup({ start = creation, profile = 'edicao', rows = [] as SorologiaResponse[] } = {}) {
  const state = { contextStatus: 200, listStatus: 200, rows, uncertain: false };
  let intention: Record<string, unknown> = {};
  const writes = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => {
    if (state.uncertain) throw new TypeError('network failure');
    return Response.json({ sorologiaId: createdId }, { status: 201 });
  });
  const fetcher: typeof fetch = async (url, init) => {
    if (url === '/v1/auth/login') return Response.json({ accessToken: 'sintetico', tokenType: 'Bearer', expiresIn: 900 });
    if (url === '/v1/auth/me') return Response.json({ usuarioId: '42', nome: 'Profissional sintético', perfil: profile });
    if (url === `/v1${attendancePath}`) return Response.json({ atendimentoId: '9007199254740994' }, { status: state.contextStatus });
    if (url === `/v1${patientPath}`) return Response.json({ pacienteId: '9007199254740993' });
    if (String(url).startsWith('/v1/operacoes/')) return Response.json({ ...intention, estado: 'confirmada',
      resultado: { sorologiaId: createdId }, expiraEm: '2099-01-01T00:00:00.000Z' });
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
    children: [{ element: <SorologiasPage />, path: '/pacientes/:pacienteId/atendimentos/:atendimentoId/sorologias' },
      { element: <SorologiaCreatePage />, path: '/pacientes/:pacienteId/atendimentos/:atendimentoId/sorologias/nova' },
      { path: '/pacientes/:pacienteId/atendimentos/:atendimentoId', element: <p>Atendimento de origem</p> }] }], { initialEntries: [start] });
  sessions.push({ manager, router });
  render(<RouterProvider router={router} />);
  return { user: userEvent.setup(), writes, state, manager, router };
}

describe('sorologias individuais', () => {
  it('revisa sete campos, preserva correção isolada e confirma uma vez com o recibo', async () => {
    const { user, writes } = await setup();
    await user.type(await screen.findByLabelText('Método sorológico'), 'Método livre sintético');
    await user.type(screen.getByLabelText('Data de solicitação'), '2026-04-10');
    await user.type(screen.getByLabelText('Data de coleta'), '2026-04-01');
    await user.selectOptions(screen.getByLabelText('Resultado da sorologia'), 'nao_informado');
    await user.type(screen.getByLabelText('Observações da sorologia'), 'Observação discriminante sintética');
    fireEvent.submit(screen.getByRole('form', { name: 'Registrar sorologia' }));
    expect(writes).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Revisar sorologia' }));
    expect(screen.getByRole('heading', { name: 'Revisão da sorologia' })).toHaveFocus();
    const summary = screen.getByRole('region', { name: 'Resumo da sorologia' });
    expect(within(summary).getAllByRole('term')).toHaveLength(7);
    expect(within(summary).getByText('Não informado (registrado)')).toBeVisible();
    expect(within(summary).getAllByText('Desconhecido / não registrado')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Voltar aos campos' }));
    await user.type(screen.getByLabelText('Laboratório'), 'Laboratório sintético');
    expect(screen.getByLabelText('Data de coleta')).toHaveValue('2026-04-01');
    await user.click(screen.getByRole('button', { name: 'Revisar sorologia' }));
    const form = screen.getByRole('form', { name: 'Registrar sorologia' });
    fireEvent.submit(form); fireEvent.submit(form);
    await waitFor(() => expect(writes).toHaveBeenCalledTimes(1));
    expect(JSON.parse(String(writes.mock.calls[0]![1]?.body))).toEqual({
      metodoSorologico: 'Método livre sintético', dataSolicitacao: '2026-04-10', dataColeta: '2026-04-01',
      dataResultado: null, resultado: 'nao_informado', laboratorio: 'Laboratório sintético',
      observacoes: 'Observação discriminante sintética',
    });
    expect(await screen.findByRole('heading', { name: `Sorologia confirmada ${createdId}` })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Confirmar sorologia' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Registrar outro episódio' }));
    expect(screen.getByLabelText('Método sorológico')).toHaveValue('');
    expect(screen.getByRole('heading', { name: `Sorologia confirmada ${createdId}` })).toBeVisible();
    expect(writes).toHaveBeenCalledTimes(1);
  });

  it('permite confirmar uma ocorrência explicitamente desconhecida, sem inventar campos', async () => {
    const { user, writes } = await setup();
    await screen.findByLabelText('Método sorológico');
    await user.click(screen.getByRole('button', { name: 'Revisar sorologia' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar sorologia' }));
    await waitFor(() => expect(writes).toHaveBeenCalledTimes(1));
    expect(JSON.parse(String(writes.mock.calls[0]![1]?.body))).toEqual(Object.fromEntries(Object.keys(emptySorologia()).map(name => [name, null])));
  });

  it('descarte exige confirmação, Escape restaura foco e a saída não deixa rascunho bloqueando', async () => {
    const { user, writes } = await setup();
    await user.type(await screen.findByLabelText('Método sorológico'), 'Rascunho sintético');
    const discard = screen.getByRole('button', { name: 'Descartar rascunho' });
    await user.click(discard);
    expect(screen.getByRole('button', { name: 'Continuar editando' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(discard).toHaveFocus();
    expect(screen.getByLabelText('Método sorológico')).toHaveValue('Rascunho sintético');
    await user.click(discard);
    await user.click(screen.getByRole('button', { name: 'Continuar editando' }));
    expect(discard).toHaveFocus();
    await user.click(discard);
    await user.click(screen.getByRole('button', { name: 'Confirmar descarte do rascunho' }));
    expect(screen.getByLabelText('Método sorológico')).toHaveValue('');
    await user.click(screen.getByRole('link', { name: '← Voltar aos episódios' }));
    expect(await screen.findByRole('heading', { name: 'Sorologias do atendimento' })).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(writes).not.toHaveBeenCalled();
  });

  it('mantém rascunho e bloqueia novo envio incerto até recuperar o recibo pela intenção', async () => {
    const { user, state, writes } = await setup();
    state.uncertain = true;
    await user.type(await screen.findByLabelText('Método sorológico'), 'Método da resposta perdida sintética');
    await user.click(screen.getByRole('button', { name: 'Revisar sorologia' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar sorologia' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível confirmar/i);
    expect(screen.getByRole('button', { name: 'Confirmar sorologia' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Voltar aos campos' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Descartar rascunho' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Verificar resultado do envio' }));
    expect(await screen.findByRole('heading', { name: `Sorologia confirmada ${createdId}` })).toBeVisible();
    expect(screen.getByText('Método da resposta perdida sintética')).toBeVisible();
    expect(writes).toHaveBeenCalledTimes(1);
  });

  it('oculta e bloqueia formulário ao revalidar acesso, preservando o rascunho após leitura autorizada', async () => {
    const { user, manager, state, writes } = await setup();
    await user.type(await screen.findByLabelText('Método sorológico'), 'Rascunho protegido sintético');
    state.contextStatus = 403;
    await act(async () => { await manager.queries.invalidateQueries({ queryKey: ['clinical'], refetchType: 'active' }); });
    expect(await screen.findByRole('heading', { name: 'Acesso não autorizado' })).toBeVisible();
    expect(screen.getByLabelText('Método sorológico')).not.toBeVisible();
    expect(screen.getByLabelText('Método sorológico')).toBeDisabled();
    state.contextStatus = 200;
    await act(async () => { await manager.queries.invalidateQueries({ queryKey: ['clinical'], refetchType: 'active' }); });
    await waitFor(() => expect(screen.getByLabelText('Método sorológico')).toBeVisible());
    expect(screen.getByLabelText('Método sorológico')).toHaveValue('Rascunho protegido sintético');
    expect(writes).not.toHaveBeenCalled();
  });

  it('pagina episódios repetidos e preserva a origem sem pressupor total', async () => {
    const rows = Array.from({ length: 21 }, (_, index) => episode(String(9007199254741000n + BigInt(index))));
    const { user } = await setup({ start: list, rows });
    await screen.findByRole('heading', { name: `Sorologia ${rows[0]!.sorologiaId}` });
    expect(screen.getAllByRole('article')).toHaveLength(20);
    expect(screen.getByRole('link', { name: '← Voltar ao atendimento de origem' })).toHaveAttribute('href', source);
    const pagination = screen.getByRole('navigation', { name: 'Paginação de sorologias do atendimento' });
    await user.click(within(pagination).getByRole('button', { name: 'Próxima' }));
    expect(await screen.findByRole('heading', { name: `Sorologia ${rows[20]!.sorologiaId}` })).toBeVisible();
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByTestId('location')).toHaveTextContent('sorologiasOffset=20');
    expect(within(pagination).getByRole('button', { name: 'Próxima' })).toBeDisabled();
    expect(within(pagination).getByRole('button', { name: 'Anterior' })).toBeEnabled();
  });

  it('consulta lê os campos publicados, distingue nulo de não informado e não recebe formulário', async () => {
    const { router } = await setup({ start: list, profile: 'consulta', rows: [episode()] });
    expect(await screen.findByRole('article', { name: `Sorologia ${createdId}` })).toHaveTextContent('Não informado (registrado)');
    expect(screen.getAllByText('Desconhecido / não registrado')).toHaveLength(2);
    expect(screen.queryByRole('link', { name: 'Registrar sorologia' })).not.toBeInTheDocument();
    await act(async () => { await router.navigate(creation); });
    expect(await screen.findByRole('heading', { name: 'Acesso de consulta' })).toBeVisible();
    expect(screen.queryByLabelText('Método sorológico')).not.toBeInTheDocument();
  });

  it('não mantém episódios anteriores visíveis após recusa de leitura', async () => {
    const { manager, state } = await setup({ start: list, rows: [episode()] });
    await screen.findByText('Texto sintético da observação');
    state.contextStatus = 403;
    await act(async () => { await manager.queries.invalidateQueries({ queryKey: ['clinical'], refetchType: 'active' }); });
    expect(await screen.findByRole('heading', { name: 'Acesso não autorizado' })).toBeVisible();
    expect(screen.queryByText('Texto sintético da observação')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Registrar sorologia' })).not.toBeInTheDocument();
  });

  it('não permite que retorno salte para outro paciente, recurso ou domínio', () => {
    expect(sameResourceReturn(attendancePath, source)).toBe(source);
    for (const invalid of ['//evil.invalid/path', '/pacientes/2/atendimentos/3', '/\\evil.invalid', 'https://evil.invalid']) {
      expect(sameResourceReturn(attendancePath, invalid)).toBe(attendancePath);
    }
    expect(sorologiaValue('resultado', null)).not.toBe(sorologiaValue('resultado', 'nao_informado'));
    expect(sorologiaValue('metodoSorologico', '')).toBe('Texto vazio');
    expect(sorologiaBody({ ...emptySorologia(), metodoSorologico: '  Método livre  ' }).metodoSorologico).toBe('  Método livre  ');
  });
});
