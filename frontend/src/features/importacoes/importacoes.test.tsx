import type { ReactElement } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/client';
import type { ImportacaoLoteDetalheResponse, ImportacaoLoteResponse } from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import { ImportacaoDetalhePage, ImportacoesPage } from './ImportacoesPage';

vi.mock('../../api/useApiQuery', () => ({ useApiQuery: vi.fn() }));

const secret = 'SEGREDO_SINTETICO_NAO_EXIBIR';
const lote: ImportacaoLoteResponse = {
  loteId: '9007199254740993', codigo: 'LOTE-SINTETICO-1', layout: '1.0', status: 'concluida',
  reprocessadoDe: null, iniciadoEm: null, finalizadoEm: null, criadoEm: '2026-01-01T12:00:00Z',
  atualizadoEm: '2026-01-01T12:00:00Z', possuiErro: true, codigoErro: 'linha_rejeitada',
  totalLinhas: 1, linhasImportadas: 0, linhasComPendencia: 0, linhasRejeitadas: 1,
};
const detail: ImportacaoLoteDetalheResponse = { ...lote, paginacaoLinhas: { limit: 20, offset: 0 }, linhas: [
  { linhaId: '9007199254740994', aba: 'Pacientes', abaOrdem: 1, numero: 4, status: 'rejeitada',
    possuiErro: true, codigoErro: 'linha_rejeitada', criadoEm: '2026-01-01T12:00:00Z', atualizadoEm: '2026-01-01T12:00:00Z' },
] };
const answers = new Map<string, unknown>();

function Location() { const location = useLocation(); return <output data-testid="location">{location.pathname}{location.search}</output>; }
function setup(element: ReactElement, url: string, route: string) {
  return render(<MemoryRouter initialEntries={[url]}><Location /><Routes><Route path={route} element={element} /></Routes></MemoryRouter>);
}
function ok<T>(data: T) { return { data, isSuccess: true, isPending: false, isFetching: false, isError: false, refetch: vi.fn() } as unknown as UseQueryResult<T, ApiError>; }

beforeEach(() => {
  answers.clear();
  answers.set('/importacoes/lotes?limit=20&offset=0', [lote]);
  answers.set(`/importacoes/lotes/${lote.loteId}?limit=20&offset=0&apenasComErro=false`, detail);
  answers.set(`/importacoes/lotes/${lote.loteId}?limit=20&offset=0&apenasComErro=true`, detail);
  vi.mocked(useApiQuery).mockImplementation(<T,>(path: string) => {
    const value = answers.get(path);
    if (!answers.has(path)) throw new Error(`Resposta sintética ausente para ${path}`);
    if (value instanceof ApiError) return { error: value, isError: true, isPending: false, isFetching: false,
      isSuccess: false, refetch: vi.fn() } as unknown as UseQueryResult<T, ApiError>;
    return ok(value as T);
  });
});

describe('consulta sanitizada de importações', () => {
  it('lista metadados em página, mantém lote ID textual e abre o detalhe', async () => {
    const user = userEvent.setup();
    setup(<ImportacoesPage />, '/importacoes', '/importacoes');
    expect(screen.getByText(lote.codigo)).toBeVisible();
    await user.click(screen.getByRole('link', { name: 'Consultar' }));
    expect(screen.getByTestId('location')).toHaveTextContent(`/importacoes/lotes/${lote.loteId}`);
  });

  it('exibe apenas campos publicados, aplica filtro e não mostra conteúdo bruto', async () => {
    const user = userEvent.setup();
    setup(<ImportacaoDetalhePage />, `/importacoes/lotes/${lote.loteId}`, '/importacoes/lotes/:loteId');
    expect(screen.getByText(lote.codigo)).toBeVisible();
    expect(screen.getAllByText('linha_rejeitada')).toHaveLength(2);
    expect(screen.getByText('Código do erro do lote')).toBeVisible();
    expect(screen.queryByText(secret)).not.toBeInTheDocument();
    expect(screen.queryByText(/dados_brutos|mensagem_processamento|hash_arquivo/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Somente linhas com erro' }));
    expect(screen.getByTestId('location')).toHaveTextContent('apenasComErro=true');
  });

  it('não mantém detalhe visível após recusa de acesso', () => {
    answers.set(`/importacoes/lotes/${lote.loteId}?limit=20&offset=0&apenasComErro=false`, new ApiError(403));
    setup(<ImportacaoDetalhePage />, `/importacoes/lotes/${lote.loteId}`, '/importacoes/lotes/:loteId');
    expect(screen.getByRole('heading', { name: 'Acesso não autorizado' })).toBeVisible();
    expect(screen.queryByText(lote.codigo)).not.toBeInTheDocument();
  });
});
