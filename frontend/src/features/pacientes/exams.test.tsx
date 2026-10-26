import type { UseQueryResult } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigate } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/client';
import type { ExameResponse } from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import { PatientExams } from './PatientResources';

vi.mock('../../api/useApiQuery', () => ({ useApiQuery: vi.fn() }));
const path = '/pacientes/9007199254740993';
const first: ExameResponse = { exameId: '9007199254740995', atendimentoId: '9007199254740994',
  bloco: 'trazido', nomeExame: 'Exame sintético A', codigoExame: 'outro', identificacao: 'Identificação A',
  resultado: 'Resultado exclusivo A', observacoes: 'Observação A' };
const second: ExameResponse = { ...first, exameId: '9007199254740996', atendimentoId: null,
  bloco: 'solicitado', identificacao: 'Identificação B', resultado: null, observacoes: null };
let state: 'success' | 'loading' | 'error';
let status: number;
let rows: ExameResponse[];

function Context() {
  const location = useLocation();
  const navigate = useNavigate();
  return <><output data-testid="location">{location.pathname}{location.search}{location.hash}</output>
    <button onClick={() => navigate(-1)}>Voltar no navegador</button></>;
}
function App() { return <><Context /><PatientExams pacienteId="9007199254740993" path={path} /></>; }
function show(url = `${path}?aba=exames&examesLimit=1&examesOffset=2&dadosOffset=20#exames`) {
  return render(<MemoryRouter initialEntries={[url]}><App /></MemoryRouter>);
}
beforeEach(() => {
  state = 'success'; status = 503; rows = [first, second];
  vi.mocked(useApiQuery).mockImplementation(<T,>() => ({ data: rows,
    isSuccess: state === 'success', isPending: false, isFetching: state === 'loading',
    isError: state === 'error', error: new ApiError(status), refetch: vi.fn(),
  }) as unknown as UseQueryResult<T, ApiError>);
});

describe('7D-U3.3 — exames da página com contexto recuperável', () => {
  it('agrupa blocos, abre exame e conserva aba, páginas, seleção e retorno ao atendimento', async () => {
    const user = userEvent.setup(); show();
    const brought = screen.getByRole('region', { name: 'Trazidos pelo paciente' });
    const requested = screen.getByRole('region', { name: 'Solicitados' });
    expect(within(brought).getByText(/1 nesta página/)).toBeVisible();
    expect(within(requested).getByText(/1 nesta página/)).toBeVisible();
    expect(screen.getByText(first.resultado!)).not.toBeVisible();
    const summary = within(brought).getByText(/Exame sintético A/);
    await user.click(summary);
    expect(screen.getByText(first.resultado!)).toBeVisible();
    const source = `${path}?aba=exames&examesLimit=1&examesOffset=2&dadosOffset=20&exameId=${first.exameId}#exames`;
    expect(screen.getByTestId('location')).toHaveTextContent(source);
    const target = new URL(screen.getByRole('link', { name: `Atendimento ${first.atendimentoId}` }).getAttribute('href')!, 'http://app.local');
    expect(target.pathname).toBe(`${path}/atendimentos/${first.atendimentoId}`);
    expect(target.searchParams.get('retorno')).toBe(source);
    await user.click(within(requested).getByText(/Exame sintético A/));
    expect(screen.getByText(first.resultado!)).not.toBeVisible();
    expect(within(requested).getAllByText('Não informado').length).toBeGreaterThan(0);
    expect(within(requested).queryByRole('link')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voltar no navegador' }));
    expect(screen.getByText(first.resultado!)).toBeVisible();
    expect(screen.getByTestId('location')).toHaveTextContent(source);
    expect(useApiQuery).toHaveBeenCalledWith(`${path}/exames?limit=1&offset=2`);
  });

  it('abre seleção por URL e distingue grupo vazio de ausência global', () => {
    rows = [first]; show(`${path}?aba=exames&exameId=${first.exameId}`);
    expect(screen.getByText(first.resultado!)).toBeVisible();
    expect(within(screen.getByRole('region', { name: 'Solicitados' }))
      .getByText('Nenhum exame deste grupo nesta página.')).toBeVisible();
    expect(screen.queryByText(/nenhum exame solicitado registrado/i)).not.toBeInTheDocument();
  });

  it('preserva blocos desconhecidos sem reinterpretar ou esconder o exame', () => {
    rows = [{ ...first, bloco: 'legado_sintetico' }]; show(`${path}?aba=exames&exameId=${first.exameId}`);
    expect(screen.getByRole('region', { name: 'Outros blocos registrados' })).toContainElement(screen.getByText(first.resultado!));
    expect(screen.getByText('legado_sintetico')).toBeVisible();
  });

  it.each(['loading', 'error'] as const)('oculta exame anterior durante %s, mantendo seleção', next => {
    const view = show(`${path}?aba=exames&exameId=${first.exameId}`);
    expect(screen.getByText(first.resultado!)).toBeVisible();
    state = next;
    view.rerender(<MemoryRouter><App /></MemoryRouter>);
    expect(screen.queryByText(first.resultado!)).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(`exameId=${first.exameId}`);
    if (next === 'error') expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();
  });

  it.each([403, 404])('recusa %s esconde dados e não oferece ação de escrita', denied => {
    state = 'error'; status = denied; show();
    expect(screen.getByRole('alert')).toBeVisible();
    expect(screen.queryByText(first.resultado!)).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('pagina por recurso e foca título mesmo quando a página seguinte está vazia', async () => {
    rows = [first]; const user = userEvent.setup(); show();
    rows = [];
    await user.click(screen.getByRole('button', { name: 'Próxima' }));
    expect(screen.getByTestId('location')).toHaveTextContent('examesOffset=3');
    expect(screen.getByTestId('location')).toHaveTextContent('dadosOffset=20');
    expect(screen.getByRole('heading', { name: 'Exames' })).toHaveFocus();
    expect(screen.getByText('Nenhum registro nesta página.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
  });
});
