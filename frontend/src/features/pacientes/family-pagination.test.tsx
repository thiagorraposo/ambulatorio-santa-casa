import { useReducer } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigate } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/client';
import type { RastreioFamiliarResponse } from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import { AttendanceFamilies } from './PatientResources';

vi.mock('../../api/useApiQuery', () => ({ useApiQuery: vi.fn() }));

const path = '/pacientes/9007199254740993/atendimentos/9007199254740995';
const snapshots: RastreioFamiliarResponse[] = [30, 50].map((length, index) => {
  const id = `90071992547410${index + 1}7`;
  return { rastreioFamiliarId: id, familiaresExaminados: true, paginacaoFamiliares: { limit: 20, offset: 0 },
    familiares: Array.from({ length }, (_, resultIndex) => ({ resultadoId: `${id}${resultIndex + 1}`,
      rastreioFamiliarId: id, identificacaoFamiliar: `Família ${length} — familiar ${resultIndex + 1}`,
      resultadoSorologia: `Resultado sintético ${resultIndex + 1}` })),
  };
});
let secondPageFailure = false;
const retry = vi.fn();

function Harness() {
  const location = useLocation();
  const navigate = useNavigate();
  const [, refresh] = useReducer(value => value + 1, 0);
  retry.mockImplementation(() => { secondPageFailure = false; refresh(); });
  return <><output data-testid="location">{location.pathname}{location.search}</output>
    <button onClick={() => navigate(-1)}>Voltar no navegador</button>
    <AttendanceFamilies path={path} />
  </>;
}

function renderFamily(search = '?familiaresLimit=1&familiaresOffset=0&aba=atendimentos&offset=80') {
  return render(<MemoryRouter initialEntries={[`${path}${search}`]}><Harness /></MemoryRouter>);
}

function navigation(snapshotId: string) {
  return within(screen.getByRole('navigation', { name: `Paginação de familiares do rastreio ${snapshotId}` }));
}

beforeEach(() => {
  secondPageFailure = false;
  retry.mockReset();
  vi.mocked(useApiQuery).mockImplementation(<T,>(resource: string): UseQueryResult<T, ApiError> => {
    const url = new URL(resource, 'http://sintetico.invalid');
    const limit = Number(url.searchParams.get('limit'));
    const offset = Number(url.searchParams.get('offset'));
    let data: unknown;
    if (url.pathname === `${path}/rastreios-familiares`) data = snapshots.slice(offset, offset + limit);
    else {
      const snapshot = snapshots.find(item => url.pathname === `${path}/rastreios-familiares/${item.rastreioFamiliarId}/familiares`);
      if (!snapshot) throw new Error(`Caminho sintético inesperado: ${resource}`);
      if (secondPageFailure && snapshot === snapshots[0] && offset === 20) return {
        isSuccess: false, isPending: false, isFetching: false, isError: true,
        error: new ApiError(503), refetch: retry,
      } as unknown as UseQueryResult<T, ApiError>;
      data = { ...snapshot, familiares: snapshot.familiares.slice(offset, offset + limit), paginacaoFamiliares: { limit, offset } };
    }
    return { data, isSuccess: true, isPending: false, isFetching: false, isError: false, refetch: retry } as unknown as UseQueryResult<T, ApiError>;
  });
});

describe('familiares: snapshots e resultados com páginas independentes — R7-01', () => {
  it('alcança os familiares 30/50 e volta à consulta, snapshot e página anteriores pela URL', async () => {
    const user = userEvent.setup();
    renderFamily();
    expect(screen.getByText('Família 30 — familiar 1')).toBeVisible();
    await user.click(navigation(snapshots[0].rastreioFamiliarId).getByRole('button', { name: 'Próxima' }));
    expect(screen.getByText('Família 30 — familiar 30')).toBeVisible();
    expect(screen.queryByText('Família 30 — familiar 1')).not.toBeInTheDocument();
    expect(screen.getByLabelText(`Resultados do rastreio ${snapshots[0].rastreioFamiliarId}`)).toHaveFocus();
    await user.click(within(screen.getByRole('navigation', { name: 'Paginação de rastreios familiares' })).getByRole('button', { name: 'Próxima' }));
    expect(screen.getByRole('heading', { name: 'Rastreios familiares deste atendimento' })).toHaveFocus();
    expect(screen.getByText('Família 50 — familiar 1')).toBeVisible();
    expect(screen.queryByText('Família 30 — familiar 30')).not.toBeInTheDocument();
    await user.click(navigation(snapshots[1].rastreioFamiliarId).getByRole('button', { name: 'Próxima' }));
    await user.click(navigation(snapshots[1].rastreioFamiliarId).getByRole('button', { name: 'Próxima' }));
    expect(screen.getByText('Família 50 — familiar 50')).toBeVisible();
    expect(navigation(snapshots[1].rastreioFamiliarId).getByRole('button', { name: 'Próxima' })).toBeDisabled();
    const url = new URL(screen.getByTestId('location').textContent!, 'http://sintetico.invalid');
    expect(url.pathname).toBe(path);
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ familiaresOffset: '1', offset: '80', aba: 'atendimentos',
      [`familiares${snapshots[0].rastreioFamiliarId}Offset`]: '20', [`familiares${snapshots[1].rastreioFamiliarId}Offset`]: '40' });
    await user.click(screen.getByRole('button', { name: 'Voltar no navegador' }));
    expect(screen.getByText('Família 50 — familiar 40')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Voltar no navegador' }));
    await user.click(screen.getByRole('button', { name: 'Voltar no navegador' }));
    expect(screen.getByText('Família 30 — familiar 30')).toBeVisible();
    expect(screen.queryByText('Família 50 — familiar 1')).not.toBeInTheDocument();
  });

  it('mantém filhos de dois snapshots visíveis em páginas distintas sem misturá-los', async () => {
    const user = userEvent.setup();
    renderFamily('?familiaresLimit=20');
    await user.click(navigation(snapshots[0].rastreioFamiliarId).getByRole('button', { name: 'Próxima' }));
    expect(screen.getByText('Família 30 — familiar 30')).toBeVisible();
    expect(screen.getByText('Família 50 — familiar 1')).toBeVisible();
    await user.click(navigation(snapshots[1].rastreioFamiliarId).getByRole('button', { name: 'Próxima' }));
    expect(screen.getByText('Família 30 — familiar 30')).toBeVisible();
    expect(screen.getByText('Família 50 — familiar 40')).toBeVisible();
    expect(screen.queryByText('Família 50 — familiar 1')).not.toBeInTheDocument();
  });

  it('mostra falha da segunda página sem anunciar ausência e permite nova leitura mantendo a URL', async () => {
    const user = userEvent.setup();
    secondPageFailure = true;
    renderFamily();
    await user.click(navigation(snapshots[0].rastreioFamiliarId).getByRole('button', { name: 'Próxima' }));
    expect(screen.getByRole('alert')).toBeVisible();
    expect(screen.queryByText('Nenhum familiar nesta página do rastreio.')).not.toBeInTheDocument();
    expect(screen.queryByText('Família 30 — familiar 1')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: `Rastreio ${snapshots[0].rastreioFamiliarId}` })).toBeVisible();
    const location = screen.getByTestId('location').textContent;
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByText('Família 30 — familiar 30')).toBeVisible();
    expect(screen.getByTestId('location')).toHaveTextContent(location!);
  });

  it('reabre diretamente uma URL de snapshot e página de filhos', () => {
    renderFamily(`?familiaresLimit=1&familiaresOffset=1&familiares${snapshots[1].rastreioFamiliarId}Offset=40`);
    expect(screen.getByText('Família 50 — familiar 50')).toBeVisible();
    expect(screen.queryByText('Família 30 — familiar 1')).not.toBeInTheDocument();
  });

  it('mantém página de filhos fora de faixa vazia sem perder o snapshot', () => {
    renderFamily(`?familiaresLimit=1&familiaresOffset=1&familiares${snapshots[1].rastreioFamiliarId}Offset=1000`);
    expect(screen.getByRole('heading', { name: `Rastreio ${snapshots[1].rastreioFamiliarId}` })).toBeVisible();
    expect(screen.getByText('Nenhum familiar nesta página do rastreio.')).toBeVisible();
    expect(navigation(snapshots[1].rastreioFamiliarId).getByRole('button', { name: 'Anterior' })).toBeEnabled();
    expect(navigation(snapshots[1].rastreioFamiliarId).getByRole('button', { name: 'Próxima' })).toBeDisabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('não expõe filhos da página anterior quando o acesso à nova leitura é recusado', () => {
    vi.mocked(useApiQuery).mockReturnValue({ isSuccess: false, isError: true, isPending: false,
      isFetching: false, error: new ApiError(403), refetch: retry } as unknown as ReturnType<typeof useApiQuery>);
    renderFamily();
    expect(screen.getByRole('alert')).toHaveTextContent('Acesso não autorizado');
    expect(screen.queryByText(/Família 30 — familiar/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument();
  });
});
