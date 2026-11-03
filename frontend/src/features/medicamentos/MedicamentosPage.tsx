import { Link, useParams, useSearchParams } from 'react-router';
import type { AtendimentoDetalheResponse, MedicamentoResponse } from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import { Card, EmptyState, PageHeading, QueryState } from '../../shared/ui';
import { Pagination, usePage } from '../pacientes/pagination';
import { sameResourceReturn } from '../sorologias/sorologia-model';
import { medicamentoFields, medicamentoValue } from './medicamento-model';

function MedicamentosCollection({ path }: { path: string }) {
  const page = usePage('medicamentos');
  const query = useApiQuery<MedicamentoResponse[]>(`${path}?limit=${page.limit}&offset=${page.offset}`);
  return <Card>
    <h2>Registros desta página</h2>
    <p>Consulta de registros já existentes. Esta tela não cadastra ou recomenda medicamentos.
      Dados do catálogo são atuais; nome livre e informações de uso permanecem separados.</p>
    <QueryState query={query}>{rows => rows.length === 0
      ? <EmptyState>Nenhum medicamento nesta página. Isso não significa ausência de uso.</EmptyState>
      : <div className="resource-list">{rows.map(row => <article key={row.atendimentoMedicamentoId}
          className="resource-item" aria-labelledby={`medicamento-${row.atendimentoMedicamentoId}`}>
          <h3 id={`medicamento-${row.atendimentoMedicamentoId}`}>Registro {row.atendimentoMedicamentoId}</h3>
          <p>Atendimento <span className="mono">{row.atendimentoId}</span></p>
          <dl className="record-grid">{medicamentoFields.map(([name,label]) => <div key={name}>
            <dt>{label}</dt><dd style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{medicamentoValue(name,row[name])}</dd>
          </div>)}</dl>
        </article>)}</div>}</QueryState>
    <Pagination label="medicamentos do atendimento" {...page}
      count={query.isSuccess && !query.isFetching ? query.data.length : undefined} onChange={page.changePage} />
    <p className="muted">Registros mais recentemente cadastrados primeiro. Datas e estados são os informados,
      sem cálculo de dose ou interpretação clínica. Uma página não representa todas as páginas.</p>
  </Card>;
}
export default function MedicamentosPage() {
  const {pacienteId='',atendimentoId=''} = useParams<{pacienteId:string;atendimentoId:string}>();
  const attendancePath = `/pacientes/${encodeURIComponent(pacienteId)}/atendimentos/${encodeURIComponent(atendimentoId)}`;
  const [params] = useSearchParams();
  const origin = sameResourceReturn(attendancePath,params.get('retorno'));
  const context = useApiQuery<AtendimentoDetalheResponse>(attendancePath);
  return <>
    <Link to={origin} className="back-link">← Voltar ao atendimento de origem</Link>
    <PageHeading title="Medicamentos do atendimento" description={`Paciente ${pacienteId} · atendimento ${atendimentoId}`} />
    <QueryState query={context}>{() => <MedicamentosCollection key={attendancePath} path={`${attendancePath}/medicamentos`} />}</QueryState>
  </>;
}
