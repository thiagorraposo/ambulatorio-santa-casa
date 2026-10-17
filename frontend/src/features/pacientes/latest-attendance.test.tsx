import type { UseQueryResult } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/client';
import type { AtendimentoResumoResponse } from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import { LatestAttendance } from './LatestAttendance';

vi.mock('../../api/useApiQuery', () => ({ useApiQuery: vi.fn() }));

const patientId = '9007199254740993';
const attendance: AtendimentoResumoResponse = {
  atendimentoId: '9007199254740995', dataAtendimento: '2026-02-21',
  localizacaoProntuario: 'Prontuário sintético', ambulatorioUnicamente: false,
  ambulatorioAnexoProjeto: null, observacoes: 'Observação desta consulta sintética', versao: '1',
};
let result: UseQueryResult<AtendimentoResumoResponse[], ApiError>;

function successful(rows: AtendimentoResumoResponse[]) {
  return { data: rows, isSuccess: true, isPending: false, isFetching: false, isError: false,
    refetch: vi.fn() } as unknown as typeof result;
}

function Harness() {
  const navigate = useNavigate();
  return <><button onClick={() => navigate('?dadosLimit=1&dadosOffset=80&atendimentosOffset=40')}>
    Outra página dos dados</button><LatestAttendance pacienteId={patientId} /></>;
}

function show() {
  return render(<MemoryRouter initialEntries={[
    `/pacientes/${patientId}?aba=dados&dadosLimit=1&dadosOffset=20`,
  ]}><Harness /></MemoryRouter>);
}

beforeEach(() => {
  result = successful([attendance]);
  vi.mocked(useApiQuery).mockImplementation(<T,>() => result as unknown as UseQueryResult<T, ApiError>);
});

describe('último atendimento por data registrada', () => {
  it('consulta a primeira posição independentemente das páginas da ficha e preserva IDs bigint', async () => {
    const user = userEvent.setup();
    show();
    const path = `/pacientes/${patientId}/atendimentos?limit=1&offset=0`;
    expect(useApiQuery).toHaveBeenCalledWith(path);
    expect(screen.getByText('21/02/2026')).toBeVisible();
    expect(screen.getByText('Observação desta consulta sintética')).toBeVisible();
    expect(screen.getByRole('link', { name: `Abrir último atendimento ${attendance.atendimentoId}` })).toHaveAttribute(
      'href', `/pacientes/${patientId}/atendimentos/${attendance.atendimentoId}`,
    );
    await user.click(screen.getByRole('button', { name: 'Outra página dos dados' }));
    expect(vi.mocked(useApiQuery).mock.calls.every(([resource]) => resource === path)).toBe(true);
    expect(screen.getByText('21/02/2026')).toBeVisible();
    expect(screen.queryByText(/comprova a ordem cronológica/)).not.toBeInTheDocument();
  });

  it('distingue nenhum atendimento de atendimento com data desconhecida', () => {
    result = successful([]);
    const view = show();
    expect(screen.getByText('Nenhum atendimento registrado.')).toBeVisible();
    result = successful([{ ...attendance, dataAtendimento: null }]);
    view.rerender(<MemoryRouter><LatestAttendance pacienteId={patientId} /></MemoryRouter>);
    expect(screen.queryByText('Nenhum atendimento registrado.')).not.toBeInTheDocument();
    expect(screen.getByText(/não comprova a ordem cronológica/)).toBeVisible();
    expect(screen.getByRole('link', { name: `Abrir último atendimento ${attendance.atendimentoId}` })).toBeVisible();
  });

  it.each(['carregando', 'recusado', 'falha'] as const)('oculta dados anteriores durante %s', state => {
    const view = show();
    expect(screen.getByText('Observação desta consulta sintética')).toBeVisible();
    result = { ...result, isFetching: state === 'carregando', isError: state !== 'carregando',
      isSuccess: false, error: state === 'recusado' ? new ApiError(403) : new ApiError(503) } as typeof result;
    view.rerender(<MemoryRouter><LatestAttendance pacienteId={patientId} /></MemoryRouter>);
    expect(screen.queryByText('Observação desta consulta sintética')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: `Abrir último atendimento ${attendance.atendimentoId}` })).not.toBeInTheDocument();
    expect(screen.queryByText('Nenhum atendimento registrado.')).not.toBeInTheDocument();
    if (state === 'carregando') expect(screen.getByRole('status')).toHaveTextContent('Carregando');
    else expect(screen.getByRole('alert')).toHaveTextContent(state === 'recusado'
      ? 'Acesso não autorizado' : 'Não foi possível carregar');
  });
});
