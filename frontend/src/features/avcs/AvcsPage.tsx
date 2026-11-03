import { Link, useLocation, useParams, useSearchParams } from 'react-router';
import type { PacienteDetalheResponse, AvcResponse } from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import { useSession } from '../../app/session';
import { Card, EmptyState, PageHeading, QueryState } from '../../shared/ui';
import { Pagination, usePage } from '../pacientes/pagination';

import { avcFields, avcValue, avcReturn } from './avc-model';

export function useAvcContext() {
  const { pacienteId = '' } = useParams<{ pacienteId: string }>();
  const patientPath = `/pacientes/${encodeURIComponent(pacienteId)}`;
  return { pacienteId, patientPath, path: `${patientPath}/avcs` };
}

export function AvcDetails({ values }: { values: Pick<AvcResponse, typeof avcFields[number][0]> }) {
  return <dl className="record-grid">{avcFields.map(([name, label]) => <div key={name}>
    <dt>{label}</dt><dd style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{avcValue(name, values[name])}</dd>
  </div>)}</dl>;
}

function AvcCollection({ path }: { path: string }) {
  const page = usePage('avcs');
  const query = useApiQuery<AvcResponse[]>(`${path}?limit=${page.limit}&offset=${page.offset}`);
  const location = useLocation();
  const session = useSession();
  const here = `${location.pathname}${location.search}${location.hash}`;
  return <>
    {session.user && session.user.perfil !== 'consulta' && !query.isError && <Link className="button" to={`${path}/nova?retorno=${encodeURIComponent(here)}`}>Registrar AVC</Link>}
    <Card>
      <h2>Episódios desta página</h2>
      <p>Afirmações longitudinais do paciente, sem vínculo persistido com atendimento. Negativa não apaga registros anteriores; ano não determina ocorrência.</p>
      <QueryState query={query}>{rows => rows.length === 0
        ? <EmptyState>Nenhum registro de AVC nesta página.</EmptyState>
        : <div className="resource-list">{rows.map(row => <article key={row.eventoId} className="resource-item" aria-labelledby={`avc-${row.eventoId}`}>
          <h3 id={`avc-${row.eventoId}`}>Registro {row.eventoId}</h3><p>Registro longitudinal do paciente.</p>
          <AvcDetails values={row} />
        </article>)}</div>}</QueryState>
      <Pagination label="registros de AVC do paciente" {...page}
        count={query.isSuccess && !query.isFetching ? query.data.length : undefined} onChange={page.changePage} />
      <p className="muted">Ocorrências mais recentemente registradas primeiro; esta ordem não define cronologia ou gravidade clínica. Uma página vazia não representa todas as páginas.</p>
    </Card>
  </>;
}

export default function AvcsPage() {
  const { pacienteId, patientPath, path } = useAvcContext();
  const [params] = useSearchParams();
  const origin = avcReturn(patientPath, params.get('retorno'));
  const context = useApiQuery<PacienteDetalheResponse>(patientPath);
  return <>
    <Link to={origin} className="back-link">← Voltar à origem</Link>
    <PageHeading title="Registros de AVC do paciente" description={`Paciente ${pacienteId} · longitudinal`} />
    <QueryState query={context}>{() => <AvcCollection key={path} path={path} />}</QueryState>
  </>;
}
