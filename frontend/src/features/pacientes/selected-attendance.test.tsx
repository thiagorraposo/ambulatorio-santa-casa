import type { UseQueryResult } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, useLocation, useNavigate } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/client';
import type { AtendimentoDetalheResponse } from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import { SelectedAttendance } from './SelectedAttendance';

vi.mock('../../api/useApiQuery', () => ({ useApiQuery: vi.fn() }));

const patientId = '9007199254740993';
const firstId = '9007199254740995';
const secondId = '9223372036854775807';
const path = `/pacientes/${patientId}/atendimentos`;
const first: AtendimentoDetalheResponse = {
  atendimentoId: firstId, dataAtendimento: '2026-02-21', localizacaoProntuario: null,
  ambulatorioUnicamente: false, ambulatorioAnexoProjeto: null, observacoes: null, versao: '1',
  dadosClinicos: { alturaCm: '9007199254740993.123456789000', pesoKg: '0.00',
    circunferenciaAbdominalCm: null, frequenciaCardiacaBpm: 0, saturacaoPercentual: null,
    paSistolicaMmhg: null, paDiastolicaMmhg: null, nyha: null, observacoes: 'Avaliação sintética A' },
  diagnosticoChagas: { possuiDiagnosticoChagas: false, statusDiagnostico: null, resultadoFinal: null,
    dataResultadoFinal: null, dataDescobertaAutorelato: '2000-03-04', criterioConfirmacao: null,
    observacoes: 'Diagnóstico sintético A' },
  exames: [], pendencias: [], rastreioFamiliar: null, rastreiosFamiliares: [],
  paginacaoColecoes: { limit: 1, offset: 0 },
};
const second: AtendimentoDetalheResponse = {
  ...first, atendimentoId: secondId, dataAtendimento: null, dadosClinicos: null, diagnosticoChagas: null,
};
const responses = new Map<string, UseQueryResult<unknown, ApiError>>();

function success(data: unknown): UseQueryResult<unknown, ApiError> {
  return { data, isSuccess: true, isPending: false, isFetching: false, isError: false,
    refetch: vi.fn() } as unknown as UseQueryResult<unknown, ApiError>;
}

function Harness() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const section = params.get('aba') === 'avaliacao' ? 'avaliacao' : 'chagas';
  params.set('aba', section === 'chagas' ? 'avaliacao' : 'chagas');
  return <><div data-testid="location">{location.search}</div>
    <Link to={{ search: `?${params}` }}>Trocar área clínica</Link>
    <button onClick={() => navigate(-1)}>Voltar no navegador</button>
    <SelectedAttendance pacienteId={patientId} section={section} /></>;
}

function show(search = `?aba=chagas&atendimentoId=${firstId}`) {
  return render(<MemoryRouter initialEntries={[`/pacientes/${patientId}${search}`]}><Harness /></MemoryRouter>);
}

beforeEach(() => {
  responses.clear();
  responses.set(`${path}?limit=20&offset=0`, success([first, second]));
  responses.set(`${path}?limit=1&offset=0`, success([first]));
  responses.set(`${path}?limit=1&offset=1`, success([second]));
  responses.set(`${path}?limit=1&offset=2`, success([]));
  responses.set(`${path}/${firstId}?limit=1&offset=0`, success(first));
  responses.set(`${path}/${secondId}?limit=1&offset=0`, success(second));
  vi.mocked(useApiQuery).mockImplementation(<T,>(resource: string) => {
    const response = responses.get(resource);
    if (!response) throw new Error(`Resposta sintética ausente: ${resource}`);
    return response as UseQueryResult<T, ApiError>;
  });
});

describe('consulta clínica selecionada', () => {
  it('exige seleção explícita e não busca detalhe nem escolhe o primeiro registro', () => {
    show('?aba=chagas&dadosOffset=20');
    expect(screen.getByRole('combobox', { name: 'Atendimento para consulta clínica' })).toHaveValue('');
    expect(screen.getByText('Selecione um atendimento para consultar os dados registrados naquela consulta.')).toBeVisible();
    expect(vi.mocked(useApiQuery).mock.calls.every(([resource]) => resource === `${path}?limit=20&offset=0`)).toBe(true);
    expect(screen.queryByText('Diagnóstico sintético A')).not.toBeInTheDocument();
  });

  it('preserva falso, zero, precisão e a consulta ao trocar de área e voltar', async () => {
    const user = userEvent.setup();
    show();
    expect(screen.getByText('Diagnóstico sintético A')).toBeVisible();
    expect(screen.getByText('Não', { selector: 'dd' })).toBeVisible();
    expect(screen.getByText('04/03/2000')).toBeVisible();
    expect(screen.getByRole('link', { name: `Abrir detalhe do atendimento ${firstId}` })).toHaveAttribute(
      'href', `${path}/${firstId}`,
    );
    await user.click(screen.getByRole('link', { name: 'Trocar área clínica' }));
    expect(screen.getByTestId('location')).toHaveTextContent(`atendimentoId=${firstId}`);
    expect(screen.getByText('9007199254740993,123456789000 cm')).toBeVisible();
    expect(screen.getByText('0,00 kg')).toBeVisible();
    expect(screen.getByText('0 bpm')).toBeVisible();
    expect(screen.queryByText('Diagnóstico sintético A')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voltar no navegador' }));
    expect(screen.getByText('Diagnóstico sintético A')).toBeVisible();
    expect(screen.queryByText('Avaliação sintética A')).not.toBeInTheDocument();
  });

  it('troca para consulta sem registros sem reutilizar o último diagnóstico ou avaliação preenchidos', async () => {
    const user = userEvent.setup();
    show();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Atendimento para consulta clínica' }), secondId);
    expect(screen.getByText('Diagnóstico não registrado neste atendimento.')).toBeVisible();
    expect(screen.queryByText('Diagnóstico sintético A')).not.toBeInTheDocument();
    expect(screen.getByText(/Data: Não informado/)).toBeVisible();
    expect(screen.getByTestId('location')).toHaveTextContent(`atendimentoId=${secondId}`);
    await user.click(screen.getByRole('link', { name: 'Trocar área clínica' }));
    expect(screen.getByText('Dados clínicos não registrados neste atendimento.')).toBeVisible();
    expect(screen.queryByText('Avaliação sintética A')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voltar no navegador' }));
    await user.click(screen.getByRole('button', { name: 'Voltar no navegador' }));
    expect(screen.getByText('Diagnóstico sintético A')).toBeVisible();
  });

  it.each(['chagas', 'avaliacao'] as const)('trata objetos clínicos independentes na área %s', section => {
    responses.set(`${path}/${firstId}?limit=1&offset=0`, success({ ...first,
      ...(section === 'chagas' ? { dadosClinicos: null } : { diagnosticoChagas: null }),
    }));
    show(`?aba=${section}&atendimentoId=${firstId}`);
    expect(screen.getByText(section === 'chagas' ? 'Diagnóstico sintético A' : 'Avaliação sintética A')).toBeVisible();
  });

  it('pagina opções sem trocar a seleção e preserva scopes e seleção ao voltar', async () => {
    const user = userEvent.setup();
    show(`?aba=chagas&atendimentoId=${firstId}&consultaLimit=1&dadosOffset=20&nome=Pessoa`);
    const pagination = within(screen.getByRole('navigation', { name: 'Paginação de consultas clínicas' }));
    await user.click(pagination.getByRole('button', { name: 'Próxima' }));
    expect(screen.getByRole('combobox', { name: 'Atendimento para consulta clínica' })).toHaveValue(firstId);
    expect(screen.getByRole('option', { name: `Atendimento ${firstId} (seleção fora desta página)` })).toBeInTheDocument();
    expect(screen.getByText('Diagnóstico sintético A')).toBeVisible();
    expect(screen.getByTestId('location')).toHaveTextContent('consultaOffset=1');
    expect(screen.getByTestId('location')).toHaveTextContent('dadosOffset=20&nome=Pessoa');
    expect(screen.getByRole('heading', { name: 'Escolher consulta' })).toHaveFocus();
    await user.click(pagination.getByRole('button', { name: 'Próxima' }));
    expect(screen.getByText('Nenhum atendimento nesta página de opções.')).toBeVisible();
    expect(screen.getByText('Diagnóstico sintético A')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Voltar no navegador' }));
    expect(screen.getByTestId('location')).toHaveTextContent('consultaOffset=1');
    expect(screen.getByRole('combobox', { name: 'Atendimento para consulta clínica' })).toHaveValue(firstId);
  });

  it.each(['-1', '9007199254740995.0', '9223372036854775808'])('recusa identificador inválido %s sem buscar detalhe', id => {
    show(`?aba=chagas&atendimentoId=${id}`);
    expect(screen.getByRole('alert')).toHaveTextContent('Identificador de atendimento inválido');
    expect(vi.mocked(useApiQuery).mock.calls.every(([resource]) => resource === `${path}?limit=20&offset=0`)).toBe(true);
  });

  it.each(['carga', '403', '404', '503'])('oculta os dados anteriores durante %s', state => {
    const view = show();
    expect(screen.getByText('Diagnóstico sintético A')).toBeVisible();
    responses.set(`${path}/${firstId}?limit=1&offset=0`, {
      ...success(first), isSuccess: false, isFetching: state === 'carga', isError: state !== 'carga',
      error: state === 'carga' ? null : new ApiError(Number(state)),
    } as UseQueryResult<unknown, ApiError>);
    view.rerender(<MemoryRouter><Harness /></MemoryRouter>);
    expect(screen.queryByText('Diagnóstico sintético A')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Consulta selecionada' })).not.toBeInTheDocument();
    expect(screen.queryByText('Diagnóstico não registrado neste atendimento.')).not.toBeInTheDocument();
    if (state === 'carga') expect(screen.getByRole('status')).toHaveTextContent('Carregando');
    else expect(screen.getByRole('alert')).toBeVisible();
  });

  it('não apresenta dados de uma resposta que não confirma o atendimento selecionado', () => {
    responses.set(`${path}/${firstId}?limit=1&offset=0`, success(second));
    show();
    expect(screen.getByRole('alert')).toHaveTextContent('A consulta não confirmou o atendimento selecionado');
    expect(screen.queryByRole('heading', { name: 'Diagnóstico de Chagas deste atendimento' })).not.toBeInTheDocument();
  });

  it.each([403, 404])('oculta detalhe anterior se a lista de opções recusa o contexto com %s', status => {
    const view = show();
    expect(screen.getByText('Diagnóstico sintético A')).toBeVisible();
    responses.set(`${path}?limit=20&offset=0`, { ...success([first, second]),
      isSuccess: false, isError: true, error: new ApiError(status),
    } as UseQueryResult<unknown, ApiError>);
    view.rerender(<MemoryRouter><Harness /></MemoryRouter>);
    expect(screen.getByRole('alert')).toBeVisible();
    expect(screen.queryByText('Diagnóstico sintético A')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Consulta selecionada' })).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(`atendimentoId=${firstId}`);
  });

  it('mantém o detalhe lido independentemente quando somente as opções falham temporariamente', () => {
    responses.set(`${path}?limit=20&offset=0`, { ...success([first, second]),
      isSuccess: false, isError: true, error: new ApiError(503),
    } as UseQueryResult<unknown, ApiError>);
    show();
    expect(screen.getByRole('alert')).toBeVisible();
    expect(screen.getByText('Diagnóstico sintético A')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Consulta selecionada' })).toBeVisible();
  });
});
