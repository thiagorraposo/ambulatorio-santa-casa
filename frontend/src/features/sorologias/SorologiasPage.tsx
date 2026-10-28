import { Link, useLocation, useParams, useSearchParams } from 'react-router';
import type { AtendimentoDetalheResponse, SorologiaResponse } from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import { useSession } from '../../app/session';
import { Card, EmptyState, PageHeading, QueryState } from '../../shared/ui';
import { Pagination, usePage } from '../pacientes/pagination';
import { sameResourceReturn, sorologiaFields, sorologiaValue } from './sorologia-model';

export function useSorologiaContext() {
  const { pacienteId = '', atendimentoId = '' } = useParams<{ pacienteId: string; atendimentoId: string }>();
  const attendancePath = `/pacientes/${encodeURIComponent(pacienteId)}/atendimentos/${encodeURIComponent(atendimentoId)}`;
  return { pacienteId, atendimentoId, attendancePath, path: `${attendancePath}/sorologias` };
}

export function SorologiaDetails({ values }: { values: Pick<SorologiaResponse, typeof sorologiaFields[number][0]> }) {
  return <dl className="record-grid">{sorologiaFields.map(([name, label]) => <div key={name}>
    <dt>{label}</dt><dd style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{sorologiaValue(name, values[name])}</dd>
  </div>)}</dl>;
}

function SorologiaCollection({ path }: { path: string }) {
  const page = usePage('sorologias');
  const query = useApiQuery<SorologiaResponse[]>(`${path}?limit=${page.limit}&offset=${page.offset}`);
  const location = useLocation();
  const session = useSession();
  const here = `${location.pathname}${location.search}${location.hash}`;
  return <>
    {session.user && session.user.perfil !== 'consulta' && !query.isError && <Link className="button" to={`${path}/nova?retorno=${encodeURIComponent(here)}`}>Registrar sorologia</Link>}
    <Card>
      <h2>Episódios desta página</h2>
      <p>Cada episódio pertence a este atendimento. Métodos iguais permanecem em registros separados; resultados não interpretam nem atualizam o diagnóstico.</p>
      <QueryState query={query}>{rows => rows.length === 0
        ? <EmptyState>Nenhuma sorologia nesta página.</EmptyState>
        : <div className="resource-list">{rows.map(row => <article key={row.sorologiaId} className="resource-item" aria-labelledby={`sorologia-${row.sorologiaId}`}>
          <h3 id={`sorologia-${row.sorologiaId}`}>Sorologia {row.sorologiaId}</h3><p>Atendimento <span className="mono">{row.atendimentoId}</span></p>
          <SorologiaDetails values={row} />
        </article>)}</div>}</QueryState>
      <Pagination label="sorologias do atendimento" {...page}
        count={query.isSuccess && !query.isFetching ? query.data.length : undefined} onChange={page.changePage} />
      <p className="muted">Episódios mais recentemente registrados primeiro; as datas não definem uma cronologia clínica. Uma página vazia não representa todas as páginas.</p>
    </Card>
  </>;
}

export default function SorologiasPage() {
  const { pacienteId, atendimentoId, attendancePath, path } = useSorologiaContext();
  const [params] = useSearchParams();
  const origin = sameResourceReturn(attendancePath, params.get('retorno'));
  const context = useApiQuery<AtendimentoDetalheResponse>(attendancePath);
  return <>
    <Link to={origin} className="back-link">← Voltar ao atendimento de origem</Link>
    <PageHeading title="Sorologias do atendimento" description={`Paciente ${pacienteId} · atendimento ${atendimentoId}`} />
    <QueryState query={context}>{() => <SorologiaCollection key={path} path={path} />}</QueryState>
  </>;
}
