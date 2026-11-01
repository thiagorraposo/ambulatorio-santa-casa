import { Link, useLocation, useParams, useSearchParams } from 'react-router';
import type { PacienteDetalheResponse, ReacaoBznOcorrenciaResponse } from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import { useSession } from '../../app/session';
import { Card, EmptyState, PageHeading, QueryState } from '../../shared/ui';
import { Pagination, usePage } from '../pacientes/pagination';

import { reacaoFields, reacaoValue } from './reacao-model';
import { avcReturn } from '../avcs/avc-model';

export function useReacaoContext() {
  const { pacienteId = '' } = useParams<{ pacienteId: string }>();
  const patientPath = `/pacientes/${encodeURIComponent(pacienteId)}`;
  return { pacienteId, patientPath, path: `${patientPath}/tratamento-bzn/reacoes` };
}

export function ReacaoDetails({ values }: { values: Pick<ReacaoBznOcorrenciaResponse, typeof reacaoFields[number][0]> }) {
  return <dl className="record-grid">{reacaoFields.map(([name, label]) => <div key={name}>
    <dt>{label}</dt><dd style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{reacaoValue(name, values[name])}</dd>
  </div>)}</dl>;
}

function ReacaoCollection({ path }: { path: string }) {
  const page = usePage('reacoes');
  const query = useApiQuery<ReacaoBznOcorrenciaResponse[]>(`${path}?limit=${page.limit}&offset=${page.offset}`);
  const location = useLocation();
  const session = useSession();
  const here = `${location.pathname}${location.search}${location.hash}`;
  return <>
    {session.user && session.user.perfil !== 'consulta' && query.isSuccess && !query.isFetching && <Link className="button" to={`${path}/nova?retorno=${encodeURIComponent(here)}`}>Registrar reação BZN</Link>}
    <Card>
      <h2>Episódios desta página</h2>
      <p>Ocorrências do tratamento canônico do paciente. Texto e gravidade são os informados, sem classificação automática. Indicadores do tratamento não são alterados.</p>
      <QueryState query={query}>{rows => rows.length === 0
        ? <EmptyState>Nenhuma reação nesta página. Ausência não significa negativa.</EmptyState>
        : <div className="resource-list">{rows.map(row => <article key={row.reacaoId} className="resource-item" aria-labelledby={`reacao-${row.reacaoId}`}>
          <h3 id={`reacao-${row.reacaoId}`}>Registro {row.reacaoId}</h3><p>Tratamento {row.tratamentoId} do paciente.</p>
          <ReacaoDetails values={row} />
        </article>)}</div>}</QueryState>
      <Pagination label="reações BZN do paciente" {...page}
        count={query.isSuccess && !query.isFetching ? query.data.length : undefined} onChange={page.changePage} />
      <p className="muted">Ocorrências mais recentemente registradas primeiro; esta ordem não define cronologia ou gravidade clínica. Uma página vazia não representa todas as páginas.</p>
    </Card>
  </>;
}

export default function ReacoesBznPage() {
  const { pacienteId, patientPath, path } = useReacaoContext();
  const [params] = useSearchParams();
  const origin = avcReturn(patientPath, params.get('retorno'));
  const context = useApiQuery<PacienteDetalheResponse>(patientPath);
  return <>
    <Link to={origin} className="back-link">← Voltar à origem</Link>
    <PageHeading title="Reações do tratamento BZN" description={`Paciente ${pacienteId} · longitudinal`} />
    <QueryState query={context}>{() => <ReacaoCollection key={path} path={path} />}</QueryState>
  </>;
}
