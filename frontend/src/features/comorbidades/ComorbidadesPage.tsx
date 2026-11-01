import { Link, useLocation, useParams, useSearchParams } from 'react-router';
import type { AtendimentoDetalheResponse, AvaliacaoComorbidadesResponse } from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import { useSession } from '../../app/session';
import { Card, PageHeading, QueryState } from '../../shared/ui';
import { sameResourceReturn } from '../sorologias/sorologia-model';
import { presenceLabel } from './comorbidades-model';

export function useComorbidadesContext() {
  const { pacienteId = '', atendimentoId = '' } = useParams<{ pacienteId: string; atendimentoId: string }>();
  const attendancePath = `/pacientes/${encodeURIComponent(pacienteId)}/atendimentos/${encodeURIComponent(atendimentoId)}`;
  return { pacienteId, atendimentoId, attendancePath, path: `${attendancePath}/comorbidades` };
}
export function ComorbidadesDetails({ values }: { values: Pick<AvaliacaoComorbidadesResponse, 'itens' | 'historicoFamiliar'> }) {
  return <>
    <h3>Comorbidades avaliadas</h3>
    {!values.itens.length && <p>Nenhuma comorbidade avaliada. Isso não representa uma negativa.</p>}
    {values.itens.map(item => <section key={item.comorbidadeId} aria-label={`Avaliação de ${item.nomeComorbidade}`}>
      <h4 style={{ overflowWrap: 'anywhere' }}>{item.nomeComorbidade}</h4>
      <dl className="record-grid"><div><dt>Presença</dt><dd>{presenceLabel(item.possuiComorbidade)}</dd></div>
        <div><dt>Observações</dt><dd style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{item.observacoes ?? 'Não registradas'}</dd></div></dl>
    </section>)}
    <h3>Histórico de doença familiar</h3>
    {values.historicoFamiliar === null ? <p>Não avaliado. Resultados de exames familiares não preenchem este histórico.</p>
      : <dl className="record-grid"><div><dt>Doença familiar relatada</dt><dd>{presenceLabel(values.historicoFamiliar.possuiDoenca)}</dd></div>
        <div><dt>Relato familiar</dt><dd style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{values.historicoFamiliar.descricao ?? 'Não registrado'}</dd></div></dl>}
  </>;
}
function Resource({ path }: { path: string }) {
  const query = useApiQuery<AvaliacaoComorbidadesResponse | null>(path);
  const session = useSession(); const location = useLocation();
  const here = `${location.pathname}${location.search}${location.hash}`;
  return <Card><QueryState query={query} emptyMessage="Nenhuma avaliação registrada neste atendimento.">{row => row && <>
    <h2>Avaliação {row.avaliacaoComorbidadesId}</h2><ComorbidadesDetails values={row} /></>}</QueryState>
    {query.isSuccess && !query.isFetching && query.data === null && session.user?.perfil !== 'consulta'
      && <Link className="button" to={`${path}/nova?retorno=${encodeURIComponent(here)}`}>Registrar comorbidades</Link>}
  </Card>;
}
export default function ComorbidadesPage() {
  const { pacienteId, atendimentoId, attendancePath, path } = useComorbidadesContext();
  const [params] = useSearchParams(); const origin = sameResourceReturn(attendancePath, params.get('retorno'));
  const context = useApiQuery<AtendimentoDetalheResponse>(attendancePath);
  return <><Link to={origin} className="back-link">← Voltar ao atendimento de origem</Link>
    <PageHeading title="Comorbidades do atendimento" description={`Paciente ${pacienteId} · atendimento ${atendimentoId}`} />
    <p>Avaliação própria desta consulta. Itens ausentes não foram avaliados; não são negativas. Nenhuma informação é copiada de outras consultas.</p>
    <QueryState query={context}>{() => <Resource key={path} path={path} />}</QueryState></>;
}
