import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useApiQuery } from '../../api/useApiQuery';
import type { ExameResponse } from '../../api/contracts';
import { Card, EmptyState, QueryState } from '../../shared/ui';
import { clinicalLabel, displayText } from '../../shared/formatters';
import { pagePath, Pagination, usePage } from './pagination';

export function Fields({ items }: { items: Array<[string, ReactNode]> }) {
  return <dl className="details-list">{items.map(([label, value]) => (
    <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
  ))}</dl>;
}

export function AttendanceLink({ pacienteId, atendimentoId }: { pacienteId: string; atendimentoId: string | null }) {
  return atendimentoId === null ? <span>{displayText(null)}</span> : (
    <Link to={`/pacientes/${encodeURIComponent(pacienteId)}/atendimentos/${encodeURIComponent(atendimentoId)}`}>
      Atendimento <span className="mono">{atendimentoId}</span>
    </Link>
  );
}

export function Collection<T>({ title, path, pageScope, emptyMessage, children }: {
  title: string;
  path: string;
  pageScope: string;
  emptyMessage?: string;
  children: (rows: T[]) => ReactNode;
}) {
  const page = usePage(pageScope);
  const query = useApiQuery<T[]>(pagePath(path, page.limit, page.offset));
  return (
    <Card className="collection-section">
      <h2>{title}</h2>
      <QueryState query={query} emptyMessage={emptyMessage ?? 'Nenhum registro nesta página.'}>
        {rows => rows.length === 0 ? <EmptyState>{emptyMessage ?? 'Nenhum registro nesta página.'}</EmptyState> : children(rows)}
      </QueryState>
      <Pagination label={title.toLowerCase()} {...page} onChange={page.changePage}
        count={query.isSuccess && !query.isFetching ? query.data.length : undefined} />
    </Card>
  );
}

export function ExamList({ rows, pacienteId }: { rows: ExameResponse[]; pacienteId: string }) {
  return <div className="resource-list">{rows.map(exam => (
    <article className="resource-item" key={exam.exameId}>
      <h3>{exam.nomeExame}</h3>
      <Fields items={[
        ['ID do exame', <span className="mono">{exam.exameId}</span>],
        ['Código do exame', exam.codigoExame], ['Bloco', clinicalLabel(exam.bloco)],
        ['Atendimento', <AttendanceLink pacienteId={pacienteId} atendimentoId={exam.atendimentoId} />],
        ['Identificação', displayText(exam.identificacao)],
        ['Resultado', displayText(exam.resultado)], ['Observações', displayText(exam.observacoes)],
      ]} />
    </article>
  ))}</div>;
}
