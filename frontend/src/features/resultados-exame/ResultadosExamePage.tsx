import { Link, useLocation, useParams, useSearchParams } from 'react-router';
import type { ExameResponse, ResultadoExameResponse } from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import { useSession } from '../../app/session';
import { Card, EmptyState, PageHeading, QueryState } from '../../shared/ui';
import { Pagination, usePage } from '../pacientes/pagination';

import { resultadoFields, resultadoValue } from './resultado-model';
import { avcReturn } from '../avcs/avc-model';

export function useResultadoContext() {
  const { pacienteId = '',exameId='' } = useParams<{ pacienteId:string;exameId:string }>();
  const patientPath = `/pacientes/${encodeURIComponent(pacienteId)}`;
  const examPath=`${patientPath}/exames/${encodeURIComponent(exameId)}`;
  return {pacienteId,exameId,patientPath,examPath,path:`${examPath}/resultados`};
}

export function ResultadoDetails({ values }: { values: Pick<ResultadoExameResponse, typeof resultadoFields[number][0]> }) {
  return <dl className="record-grid">{resultadoFields.map(([name, label]) => <div key={name}>
    <dt>{label}</dt><dd style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{resultadoValue(name, values[name])}</dd>
  </div>)}</dl>;
}

function ResultadoCollection({ path }: { path: string }) {
  const page = usePage('resultados');
  const query = useApiQuery<ResultadoExameResponse[]>(`${path}?limit=${page.limit}&offset=${page.offset}`);
  const location = useLocation();
  const session = useSession();
  const here = `${location.pathname}${location.search}${location.hash}`;
  return <>
    {session.user && session.user.perfil !== 'consulta' && query.isSuccess && !query.isFetching && <Link className="button" to={`${path}/nova?retorno=${encodeURIComponent(here)}`}>Registrar parâmetro</Link>}
    <Card>
      <h2>Episódios desta página</h2>
      <p>Parâmetros informados pela equipe. Valores e unidades não são convertidos; interpretação é o texto humano registrado, sem cálculo de diagnóstico.</p>
      <QueryState query={query}>{rows => rows.length === 0
        ? <EmptyState>Nenhum parâmetro nesta página. Isso não significa resultado negativo.</EmptyState>
        : <div className="resource-list">{rows.map(row => <article key={row.resultadoId} className="resource-item" aria-labelledby={`resultado-${row.resultadoId}`}>
          <h3 id={`resultado-${row.resultadoId}`}>Registro {row.resultadoId}</h3><p>Exame {row.exameId} do paciente.</p>
          <ResultadoDetails values={row} />
        </article>)}</div>}</QueryState>
      <Pagination label="parâmetros do exame" {...page}
        count={query.isSuccess && !query.isFetching ? query.data.length : undefined} onChange={page.changePage} />
      <p className="muted">Ocorrências mais recentemente registradas primeiro; esta ordem não define cronologia ou gravidade clínica. Uma página vazia não representa todas as páginas.</p>
    </Card>
  </>;
}

export default function ResultadosExamePage() {
  const { pacienteId,exameId,patientPath,examPath,path } = useResultadoContext();
  const [params] = useSearchParams();
  const origin = avcReturn(patientPath, params.get('retorno'));
  const context = useApiQuery<ExameResponse>(examPath);
  return <>
    <Link to={origin} className="back-link">← Voltar à origem</Link>
    <PageHeading title="Parâmetros do exame" description={`Paciente ${pacienteId} · exame ${exameId}`} />
    <QueryState query={context}>{exam => <>
      <Card><h2>{exam.nomeExame} · exame {exam.exameId}</h2>
        <p>Identificação informada: {exam.identificacao ?? 'Não informada'} · bloco {exam.bloco}.</p>
        <p>Atendimento relacionado: {exam.atendimentoId ?? 'Não registrado'}. O parâmetro pertence a este exame do paciente.</p></Card>
      <ResultadoCollection key={path} path={path} /></>}</QueryState>
  </>;
}
