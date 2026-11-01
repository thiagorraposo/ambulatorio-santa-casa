import { Link, useLocation, useParams, useSearchParams } from 'react-router';
import type { PacienteDetalheResponse, ObitoResponse } from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import { useSession } from '../../app/session';
import { Card, PageHeading, QueryState } from '../../shared/ui';
import { avcReturn as patientReturn } from '../avcs/avc-model';
import { obitoFields, obitoValue, type ObitoField } from './obito-model';

export function useObitoContext() {
  const { pacienteId = '' } = useParams<{ pacienteId:string }>();
  const patientPath = `/pacientes/${encodeURIComponent(pacienteId)}`;
  return { pacienteId,patientPath,path:`${patientPath}/obito` };
}
export function ObitoDetails({ values }: { values: Pick<ObitoResponse, ObitoField> }) {
  return <dl className="record-grid">{obitoFields.map(([name, label]) => <div key={name}>
    <dt>{label}</dt><dd style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{obitoValue(name, values[name])}</dd>
  </div>)}</dl>;
}
function ObitoResource({ path }: { path: string }) {
  const query = useApiQuery<ObitoResponse | null>(path);
  const session = useSession();
  const location = useLocation();
  const here = `${location.pathname}${location.search}${location.hash}`;
  return <Card>
    <QueryState query={query} emptyMessage="Nenhum estado de óbito registrado. Ausência não significa negativa.">{row => row && <>
      <h2>Estado {row.obitoId}</h2><p>Estado consolidado informado do paciente.</p>
      <ObitoDetails values={row} /></>}</QueryState>
    {query.isSuccess && !query.isFetching && query.data === null && session.user?.perfil !== 'consulta'
      && <Link className="button" to={`${path}/nova?retorno=${encodeURIComponent(here)}`}>Registrar estado de óbito</Link>}
  </Card>;
}
export default function ObitoPage() {
  const { pacienteId,patientPath,path } = useObitoContext();
  const [params] = useSearchParams();
  const origin = patientReturn(patientPath, params.get('retorno'));
  const context = useApiQuery<PacienteDetalheResponse>(patientPath);
  return <>
    <Link to={origin} className="back-link">← Voltar à origem</Link>
    <PageHeading title="Estado de óbito do paciente" description={`Paciente ${pacienteId} · longitudinal`} />
    <p>Estado consolidado do paciente. Ausência de registro não significa negativa. O registro não associa causa à doença de Chagas nem representa uma consulta.</p>
    <QueryState query={context}>{() => <ObitoResource key={path} path={path} />}</QueryState>
  </>;
}
