import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { ApiError } from '../api/client';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function PageHeading({ title, description }: { title: string; description?: string }) {
  return <div className="page-heading"><h1 tabIndex={-1}>{title}</h1>
    {description && <p className="muted">{description}</p>}</div>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty-state" role="status"><p>{children}</p></div>;
}

export function ApiErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  const safe = error instanceof ApiError ? error : new ApiError(0);
  return <div className="error-state" role="alert">
    <h2>{safe.status === 403 ? 'Acesso não autorizado' : 'Não foi possível carregar'}</h2>
    <p>{safe.message}</p>
    {retry && safe.status !== 403 && safe.status !== 404 && <button className="button button-secondary"
      onClick={retry}>Tentar novamente</button>}
  </div>;
}

export function QueryState<T>({ query, children, emptyMessage = 'Nenhum registro informado.' }: {
  query: UseQueryResult<T, ApiError>; children: (data: T) => ReactNode; emptyMessage?: string;
}) {
  // Refetch failures must not leave a previously authorized clinical result on screen.
  if (query.isFetching || query.isPending) return <div className="loading-state" role="status">
    <span className="spinner" aria-hidden="true" /><p>Carregando…</p></div>;
  if (query.isError) return <ApiErrorState error={query.error} retry={() => { void query.refetch(); }} />;
  if (query.data == null) return <EmptyState>{emptyMessage}</EmptyState>;
  return <>{children(query.data)}</>;
}
