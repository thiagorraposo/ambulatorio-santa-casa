import { Link, useLocation, useParams, useSearchParams } from 'react-router';
import type { AtendimentoDetalheResponse, ComplicacaoResponse } from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import { useSession } from '../../app/session';
import { Card, EmptyState, PageHeading, QueryState } from '../../shared/ui';
import { Pagination, usePage } from '../pacientes/pagination';
import { sameResourceReturn } from '../sorologias/sorologia-model';
import { complicacaoFields, complicacaoValue } from './complicacao-model';

export function useComplicacaoContext() {
  const { pacienteId = '', atendimentoId = '' } = useParams<{ pacienteId: string; atendimentoId: string }>();
  const attendancePath = `/pacientes/${encodeURIComponent(pacienteId)}/atendimentos/${encodeURIComponent(atendimentoId)}`;
  return { pacienteId, atendimentoId, attendancePath, path: `${attendancePath}/complicacoes-chagas` };
}

export function ComplicacaoDetails({ values }: { values: Pick<ComplicacaoResponse, typeof complicacaoFields[number][0]> }) {
  return <dl className="record-grid">{complicacaoFields.map(([name, label]) => <div key={name}>
    <dt>{label}</dt><dd style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{complicacaoValue(name, values[name])}</dd>
  </div>)}</dl>;
}

function ComplicacaoCollection({ path }: { path: string }) {
  const page = usePage('complicacoes');
  const query = useApiQuery<ComplicacaoResponse[]>(`${path}?limit=${page.limit}&offset=${page.offset}`);
  const location = useLocation();
  const session = useSession();
  const here = `${location.pathname}${location.search}${location.hash}`;
  return <>
    {session.user && session.user.perfil !== 'consulta' && !query.isError && <Link className="button" to={`${path}/nova?retorno=${encodeURIComponent(here)}`}>Registrar complicação</Link>}
    <Card>
      <h2>Episódios desta página</h2>
      <p>Cada episódio pertence a este atendimento. Tipos e conteúdos iguais permanecem em registros separados; descrição e gravidade não determinam presença ou diagnóstico.</p>
      <QueryState query={query}>{rows => rows.length === 0
        ? <EmptyState>Nenhuma complicação nesta página.</EmptyState>
        : <div className="resource-list">{rows.map(row => <article key={row.complicacaoChagasId} className="resource-item" aria-labelledby={`complicacao-${row.complicacaoChagasId}`}>
          <h3 id={`complicacao-${row.complicacaoChagasId}`}>Complicação {row.complicacaoChagasId}</h3><p>Atendimento <span className="mono">{row.atendimentoId}</span></p>
          <ComplicacaoDetails values={row} />
        </article>)}</div>}</QueryState>
      <Pagination label="complicações do atendimento" {...page}
        count={query.isSuccess && !query.isFetching ? query.data.length : undefined} onChange={page.changePage} />
      <p className="muted">Ocorrências mais recentemente registradas primeiro; esta ordem não define cronologia ou gravidade clínica. Uma página vazia não representa todas as páginas.</p>
    </Card>
  </>;
}

export default function ComplicacoesPage() {
  const { pacienteId, atendimentoId, attendancePath, path } = useComplicacaoContext();
  const [params] = useSearchParams();
  const origin = sameResourceReturn(attendancePath, params.get('retorno'));
  const context = useApiQuery<AtendimentoDetalheResponse>(attendancePath);
  return <>
    <Link to={origin} className="back-link">← Voltar ao atendimento de origem</Link>
    <PageHeading title="Complicações do atendimento" description={`Paciente ${pacienteId} · atendimento ${atendimentoId}`} />
    <QueryState query={context}>{() => <ComplicacaoCollection key={path} path={path} />}</QueryState>
  </>;
}
