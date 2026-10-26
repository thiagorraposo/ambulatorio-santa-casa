import { useState, type ReactNode } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import { useApiQuery } from '../../api/useApiQuery';
import { useSession } from '../../app/session';
import { ApiErrorState, EmptyState } from '../../shared/ui';
import { FollowupField } from './FollowupFields';

export function FollowupRead<T>({ query, children }: {
  query: UseQueryResult<T, ApiError>; children: (data: T) => ReactNode;
}) {
  const unavailable = query.isFetching || query.isError;
  return <>
    {(query.isFetching || query.isPending) && <div className="loading-state" role="status">Carregando…</div>}
    {query.isError && <ApiErrorState error={query.error} retry={() => { void query.refetch(); }} />}
    {query.data !== undefined && <fieldset className="form-body" disabled={unavailable} hidden={unavailable}>
      <legend className="sr-only">Contexto do acompanhamento</legend>{children(query.data)}
    </fieldset>}
  </>;
}

/** Checking an existing canonical association must inspect more than page one. */
export function useFollowupAll<T>(path: string): UseQueryResult<T[], ApiError> {
  const session = useSession();
  return useQuery<T[], ApiError>({
    queryKey: ['clinical', session.generation, 'followup-complete', path],
    enabled: session.status === 'authenticated' && !session.identityError,
    queryFn: async ({ signal }) => {
      const rows: T[] = [];
      for (let offset = 0; offset <= 100000; offset += 100) {
        const page = await session.client.get<T[]>(`${path}?limit=100&offset=${offset}`, signal);
        rows.push(...page);
        if (page.length < 100) return rows;
      }
      throw new ApiError(400);
    },
  });
}

/** Page selectors keep the selected string ID while the available choices change pages. */
export function FollowupChoice<T>({ label, path, value, onChange, idOf, labelOf,
  required = false, filter, emptyLabel, onRecord }: {
  label: string; path: string; value: string; onChange: (value: string) => void;
  idOf: (row: T) => string; labelOf: (row: T) => string;
  required?: boolean; filter?: (row: T) => boolean; emptyLabel?: string;
  onRecord?: (row: T) => void;
}) {
  const [offset, setOffset] = useState(0);
  const query = useApiQuery<T[]>(`${path}${path.includes('?') ? '&' : '?'}limit=20&offset=${offset}`);
  const [selected, setSelected] = useState<{ id: string; label: string } | null>(null);
  const available = query.isSuccess && !query.isFetching ? query.data.filter(row => !filter || filter(row)) : [];
  const count = query.isSuccess && !query.isFetching ? query.data.length : undefined;
  const selectedLabel = selected?.id === value ? selected.label : `ID ${value} (seleção mantida)`;
  return <div className="choice-field">
    <FollowupField label={label}>{id => <select id={id} required={required} value={value}
      disabled={query.isPending || query.isFetching || query.isError}
      onChange={event => {
        const next = event.target.value;
        const row = available.find(item => idOf(item) === next);
        if (row) { setSelected({ id: next, label: labelOf(row) }); onRecord?.(row); }
        onChange(next);
      }}>
      <option value="">{emptyLabel ?? (required ? 'Selecione um registro' : 'Não vinculado / desconhecido')}</option>
      {value && !available.some(row => idOf(row) === value) && <option value={value}>{selectedLabel}</option>}
      {available.map(row => <option value={idOf(row)} key={idOf(row)}>{labelOf(row)}</option>)}
    </select>}</FollowupField>
    {query.isError && <ApiErrorState error={query.error} retry={() => { void query.refetch(); }} />}
    {query.isPending || query.isFetching ? <p role="status" className="muted">Carregando opções…</p>
      : query.isSuccess && available.length === 0 && <EmptyState>Nenhuma opção nesta página.</EmptyState>}
    <nav className="pagination" aria-label={`Paginação das opções de ${label.toLowerCase()}`}>
      <p className="muted">{offset === 0 ? 'Primeira página' : `Deslocamento ${offset}`}</p><div>
        <button type="button" className="button button-secondary" disabled={offset === 0 || query.isFetching}
          onClick={() => setOffset(previous => Math.max(0, previous - 20))}>Opções anteriores</button>
        <button type="button" className="button button-secondary" disabled={count === undefined || count < 20 || offset + 20 > 100000}
          onClick={() => setOffset(previous => previous + 20)}>Mais opções</button>
      </div>
    </nav>
  </div>;
}
