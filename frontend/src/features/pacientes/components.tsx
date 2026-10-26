import { useEffect, useRef, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { useApiQuery } from '../../api/useApiQuery';
import type { ExameResponse } from '../../api/contracts';
import { Card, EmptyState, QueryState } from '../../shared/ui';
import { clinicalLabel, displayText } from '../../shared/formatters';
import { pagePath, Pagination, usePage } from './pagination';
import { attendanceDetailPath } from './attendance-navigation';

export function Fields({ items }: { items: Array<[string, ReactNode]> }) {
  return <dl className="details-list">{items.map(([label, value]) => (
    <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
  ))}</dl>;
}

export function AttendanceLink({ pacienteId, atendimentoId }: { pacienteId: string; atendimentoId: string | null }) {
  const location = useLocation();
  const patientPath = `/pacientes/${encodeURIComponent(pacienteId)}`;
  const origin = `${location.pathname}${location.search}${location.hash}`;
  const detail = atendimentoId === null ? null : `${patientPath}/atendimentos/${encodeURIComponent(atendimentoId)}`;
  return atendimentoId === null ? <span>{displayText(null)}</span> : (
    <Link to={location.pathname === detail ? origin : attendanceDetailPath(patientPath, atendimentoId, origin)}>
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
  const heading = useRef<HTMLHeadingElement>(null);
  const previousPage = useRef(`${page.limit}:${page.offset}`);
  const needsFocus = useRef(false);
  useEffect(() => {
    const key = `${page.limit}:${page.offset}`;
    if (previousPage.current !== key) needsFocus.current = true;
    previousPage.current = key;
    if (needsFocus.current && !query.isFetching && !query.isPending) {
      heading.current?.focus();
      needsFocus.current = false;
    }
  }, [page.limit, page.offset, query.isFetching, query.isPending]);
  return (
    <Card className="collection-section">
      <h2 ref={heading} tabIndex={-1}>{title}</h2>
      <QueryState query={query} emptyMessage={emptyMessage ?? 'Nenhum registro nesta página.'}>
        {rows => rows.length === 0 ? <EmptyState>{emptyMessage ?? 'Nenhum registro nesta página.'}</EmptyState> : children(rows)}
      </QueryState>
      <Pagination label={title.toLowerCase()} {...page} onChange={page.changePage}
        count={query.isSuccess && !query.isFetching ? query.data.length : undefined} />
    </Card>
  );
}

export function ExamList({ rows, pacienteId }: { rows: ExameResponse[]; pacienteId: string }) {
  const [search] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const groups = [
    ['trazido', 'Trazidos pelo paciente'], ['solicitado', 'Solicitados'],
  ];
  const other = rows.filter(exam => !groups.some(([block]) => exam.bloco === block));
  return <div className="exam-groups">
    <p className="muted">Grupos referentes somente a esta página. Abra um exame para consultar seus detalhes.</p>
    {[...groups.map(([block, title]) => ({ title, exams: rows.filter(exam => exam.bloco === block) })),
      ...(other.length ? [{ title: 'Outros blocos registrados', exams: other }] : [])].map(({ title, exams }) => (
      <section className="exam-group" aria-label={title} key={title}>
        <h3>{title} <span className="badge">{exams.length} nesta página</span></h3>
        {exams.length === 0 ? <EmptyState>Nenhum exame deste grupo nesta página.</EmptyState> :
          <div className="resource-list">{exams.map(exam => <details className="resource-item" key={exam.exameId}
            open={search.get('exameId') === exam.exameId}>
            <summary onClick={event => {
              event.preventDefault();
              const next = new URLSearchParams(search);
              if (next.get('exameId') === exam.exameId) next.delete('exameId');
              else next.set('exameId', exam.exameId);
              void navigate({ search: `?${next}`, hash: location.hash }, { preventScrollReset: true });
            }}>{exam.nomeExame} · {displayText(exam.identificacao)} <span className="mono">(ID {exam.exameId})</span></summary>
            <Fields items={[
              ['ID do exame', <span className="mono">{exam.exameId}</span>],
              ['Código do exame', exam.codigoExame], ['Bloco', clinicalLabel(exam.bloco)],
              ['Atendimento', <AttendanceLink pacienteId={pacienteId} atendimentoId={exam.atendimentoId} />],
              ['Identificação', displayText(exam.identificacao)],
              ['Resultado', displayText(exam.resultado)], ['Observações', displayText(exam.observacoes)],
            ]} />
          </details>)}</div>}
      </section>
    ))}
  </div>;
}
