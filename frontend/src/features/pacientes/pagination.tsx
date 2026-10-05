import { useEffect } from 'react';
import { useSearchParams } from 'react-router';

export const PAGE_SIZE = 20;
const MAX_OFFSET = 100000;

function integerParam(raw: string | null, fallback: number, minimum: number, maximum: number): number {
  if (raw === null || !/^\d+$/.test(raw)) return fallback;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= minimum && value <= maximum ? value : fallback;
}

function normalizeProvidedPagination(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params);
  // Normalizar todos os scopes juntos evita que hooks montados na mesma
  // página sobrescrevam as correções uns dos outros. Filtros não são alterados
  // e parâmetros ausentes continuam ausentes, usando os defaults da consulta.
  for (const key of new Set(params.keys())) {
    if (key === 'limit' || key.endsWith('Limit')) {
      const value = integerParam(params.get(key), PAGE_SIZE, 1, 100);
      if (params.get(key) !== String(value)) next.set(key, String(value));
    } else if (key === 'offset' || key.endsWith('Offset')) {
      const value = integerParam(params.get(key), 0, 0, MAX_OFFSET);
      if (params.get(key) !== String(value)) next.set(key, String(value));
    }
  }
  return next;
}

export function usePage(scope = '') {
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const normalized = normalizeProvidedPagination(searchParams);
    if (normalized.toString() !== searchParams.toString()) setSearchParams(normalized, { replace: true });
  }, [searchParams, setSearchParams]);
  const limitKey = scope ? `${scope}Limit` : 'limit';
  const offsetKey = scope ? `${scope}Offset` : 'offset';
  const limit = integerParam(searchParams.get(limitKey), PAGE_SIZE, 1, 100);
  const offset = integerParam(searchParams.get(offsetKey), 0, 0, MAX_OFFSET);
  function changePage(nextOffset: number, nextLimit = limit) {
    const next = new URLSearchParams(searchParams);
    next.set(limitKey, String(nextLimit));
    next.set(offsetKey, String(Math.max(0, Math.min(MAX_OFFSET, nextOffset))));
    setSearchParams(next);
  }
  return { limit, offset, changePage };
}

export function pagePath(path: string, limit: number, offset: number): string {
  return `${path}${path.includes('?') ? '&' : '?'}limit=${limit}&offset=${offset}`;
}

export function Pagination({ label, limit, offset, count, showCount = true, onChange }: {
  label: string;
  limit: number;
  offset: number;
  count?: number;
  showCount?: boolean;
  onChange: (offset: number, limit?: number) => void;
}) {
  return (
    <nav className="pagination" aria-label={`Paginação de ${label}`}>
      <p className="muted">
        {showCount && count !== undefined && `${count} ${count === 1 ? 'item nesta página' : 'itens nesta página'} · `}
        {offset > 0 ? `Deslocamento ${offset}` : 'Primeira página'}
      </p>
      <div className="pagination-actions">
        <button className="button button-secondary" disabled={offset === 0}
          onClick={() => onChange(Math.max(0, offset - limit))}>Anterior</button>
        <button className="button button-secondary" disabled={count === undefined || count < limit || offset + limit > MAX_OFFSET}
          onClick={() => onChange(offset + limit)}>Próxima</button>
        <label>
          Itens por página
          <select value={limit} onChange={event => onChange(0, Number(event.target.value))}>
            {[...new Set([10, 20, 50, 100, limit])].sort((a, b) => a - b).map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>
      </div>
    </nav>
  );
}
