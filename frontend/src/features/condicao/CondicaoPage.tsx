import { Link, useLocation, useParams, useSearchParams } from 'react-router';
import type { AtendimentoDetalheResponse, CondicaoChagasResponse } from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import { useSession } from '../../app/session';
import { Card, PageHeading, QueryState } from '../../shared/ui';
import { sameResourceReturn } from '../sorologias/sorologia-model';
import { condicaoFields, condicaoValue, type CondicaoField } from './condicao-model';

export function useCondicaoContext() {
  const { pacienteId = '', atendimentoId = '' } = useParams<{ pacienteId: string; atendimentoId: string }>();
  const attendancePath = `/pacientes/${encodeURIComponent(pacienteId)}/atendimentos/${encodeURIComponent(atendimentoId)}`;
  return { pacienteId, atendimentoId, attendancePath, path: `${attendancePath}/condicao-chagas` };
}
export function CondicaoDetails({ values }: { values: Pick<CondicaoChagasResponse, CondicaoField> }) {
  return <dl className="record-grid">{condicaoFields.map(([name, label]) => <div key={name}>
    <dt>{label}</dt><dd style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{condicaoValue(name, values[name])}</dd>
  </div>)}</dl>;
}
function CondicaoResource({ path }: { path: string }) {
  const query = useApiQuery<CondicaoChagasResponse | null>(path);
  const session = useSession();
  const location = useLocation();
  const here = `${location.pathname}${location.search}${location.hash}`;
  return <Card>
    <QueryState query={query} emptyMessage="Nenhuma condição registrada neste atendimento.">{row => row && <>
      <h2>Condição {row.condicaoChagasId}</h2><p>Atendimento <span className="mono">{row.atendimentoId}</span></p>
      <CondicaoDetails values={row} /></>}</QueryState>
    {query.isSuccess && !query.isFetching && query.data === null && session.user?.perfil !== 'consulta'
      && <Link className="button" to={`${path}/nova?retorno=${encodeURIComponent(here)}`}>Registrar condição de Chagas</Link>}
  </Card>;
}
export default function CondicaoPage() {
  const { pacienteId, atendimentoId, attendancePath, path } = useCondicaoContext();
  const [params] = useSearchParams();
  const origin = sameResourceReturn(attendancePath, params.get('retorno'));
  const context = useApiQuery<AtendimentoDetalheResponse>(attendancePath);
  return <>
    <Link to={origin} className="back-link">← Voltar ao atendimento de origem</Link>
    <PageHeading title="Condição de Chagas do atendimento" description={`Paciente ${pacienteId} · atendimento ${atendimentoId}`} />
    <p>Os campos pertencem somente a este atendimento. Ausência de registro não significa ausência da doença ou de sintomas; não há classificação automática.</p>
    <QueryState query={context}>{() => <CondicaoResource key={path} path={path} />}</QueryState>
  </>;
}
