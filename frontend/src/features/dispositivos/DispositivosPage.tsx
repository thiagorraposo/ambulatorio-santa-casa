import { Link, useLocation, useParams, useSearchParams } from 'react-router';
import type { PacienteDetalheResponse, DispositivoResponse } from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import { useSession } from '../../app/session';
import { Card, EmptyState, PageHeading, QueryState } from '../../shared/ui';

import { avcReturn as patientReturn } from '../avcs/avc-model';
import { dispositivoFields, dispositivoValue } from './dispositivo-model';

export function useDispositivoContext() {
  const { pacienteId = '' } = useParams<{ pacienteId: string }>();
  const patientPath = `/pacientes/${encodeURIComponent(pacienteId)}`;
  return { pacienteId, patientPath, path: `${patientPath}/dispositivos` };
}

export function DispositivoDetails({ values }: { values: Pick<DispositivoResponse, typeof dispositivoFields[number][0]> }) {
  return <dl className="record-grid">{dispositivoFields.map(([name, label]) => <div key={name}>
    <dt>{label}</dt><dd style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{dispositivoValue(name, values[name])}</dd>
  </div>)}</dl>;
}

function DispositivoCollection({ path }: { path: string }) {
  const query = useApiQuery<DispositivoResponse[]>(`${path}?limit=100&offset=0`);
  const location = useLocation();
  const session = useSession();
  const here = `${location.pathname}${location.search}${location.hash}`;
  return <>
    {session.user && session.user.perfil !== 'consulta' && !query.isError && !query.isFetching && query.isSuccess && query.data.length < 2 && <Link className="button" to={`${path}/nova?retorno=${encodeURIComponent(here)}`}>Registrar dispositivo</Link>}
    <Card>
      <h2>Estados registrados</h2>
      <p>Estados consolidados do paciente, sem vínculo persistido com atendimento. Não representam procedimento ou data de implante.</p>
      <QueryState query={query}>{rows => rows.length === 0
        ? <EmptyState>Nenhum estado de Marcapasso ou CDI registrado.</EmptyState>
        : <div className="resource-list">{rows.map(row => <article key={row.dispositivoId} className="resource-item" aria-labelledby={`avc-${row.dispositivoId}`}>
          <h3 id={`avc-${row.dispositivoId}`}>Registro {row.dispositivoId}</h3><p>Registro longitudinal do paciente.</p>
          <DispositivoDetails values={row} />
        </article>)}</div>}</QueryState>
      <p className="muted">Um estado por paciente e tipo. Um novo envio não substitui o estado existente.</p>
    </Card>
  </>;
}

export default function DispositivosPage() {
  const { pacienteId, patientPath, path } = useDispositivoContext();
  const [params] = useSearchParams();
  const origin = patientReturn(patientPath, params.get('retorno'));
  const context = useApiQuery<PacienteDetalheResponse>(patientPath);
  return <>
    <Link to={origin} className="back-link">← Voltar à origem</Link>
    <PageHeading title="Marcapasso e CDI do paciente" description={`Paciente ${pacienteId} · longitudinal`} />
    <QueryState query={context}>{() => <DispositivoCollection key={path} path={path} />}</QueryState>
  </>;
}
