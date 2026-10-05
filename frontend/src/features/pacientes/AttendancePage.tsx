import { Link, useParams } from 'react-router';
import type { AtendimentoDetalheResponse, RastreioFamiliarResponse } from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import { Card, EmptyState, PageHeading, QueryState } from '../../shared/ui';
import { clinicalLabel, displayText, formatClinicalDate, formatNumeric, triState } from '../../shared/formatters';
import { ExamList, Fields } from './components';
import { pagePath, Pagination, usePage } from './pagination';

function FamilyScreenings({ rows }: { rows: RastreioFamiliarResponse[] }) {
  return <>{rows.map(item => <article className="resource-item" key={item.rastreioFamiliarId}>
    <h3>Rastreio <span className="mono">{item.rastreioFamiliarId}</span></h3>
    <Fields items={[['Familiares examinados', triState(item.familiaresExaminados)]]} />
    {item.familiares.length === 0 ? <EmptyState>Nenhum familiar nesta página do rastreio.</EmptyState> : (
      <div className="table-scroll"><table className="data-table">
        <caption>Familiares desta página do rastreio {item.rastreioFamiliarId}</caption>
        <thead><tr><th scope="col">Identificação do familiar</th><th scope="col">Resultado de sorologia</th></tr></thead>
        <tbody>{item.familiares.map((family, index) => <tr key={`${index}-${family.identificacaoFamiliar}`}>
          <td>{displayText(family.identificacaoFamiliar)}</td><td>{clinicalLabel(family.resultadoSorologia)}</td>
        </tr>)}</tbody>
      </table></div>
    )}
  </article>)}</>;
}

export default function AttendancePage() {
  const { pacienteId = '', atendimentoId = '' } = useParams<{ pacienteId: string; atendimentoId: string }>();
  const page = usePage();
  const patientPath = `/pacientes/${encodeURIComponent(pacienteId)}`;
  const query = useApiQuery<AtendimentoDetalheResponse>(pagePath(`${patientPath}/atendimentos/${encodeURIComponent(atendimentoId)}`, page.limit, page.offset));

  return <>
    <nav className="breadcrumb" aria-label="Caminho da página">
      <Link to="/pacientes">Pacientes</Link><Link to={`${patientPath}?aba=atendimentos`}>Histórico do paciente</Link><span>Atendimento</span>
    </nav>
    <PageHeading title="Detalhe do atendimento" description={`Paciente ${pacienteId} · atendimento ${atendimentoId}`} />
    <QueryState query={query}>
      {data => {
        const clinical = data.dadosClinicos;
        const diagnosis = data.diagnosticoChagas;
        // rastreiosFamiliares é a coleção canônica; o alias singular não deve
        // duplicar um snapshot nem ocultar outros existentes.
        const families = data.rastreiosFamiliares;
        const collectionLength = Math.max(data.exames.length, data.pendencias.length, families.length,
          ...families.map(item => item.familiares.length));
        return <>
          <Card>
            <h2>Atendimento de {formatClinicalDate(data.dataAtendimento)}</h2>
            <Fields items={[
              ['ID do atendimento', <span className="mono">{data.atendimentoId}</span>],
              ['Localização do prontuário', displayText(data.localizacaoProntuario)],
              ['Unicamente pelo ambulatório', triState(data.ambulatorioUnicamente)],
              ['Ambulatório anexo a projeto', triState(data.ambulatorioAnexoProjeto)],
              ['Observações', displayText(data.observacoes)],
            ]} />
          </Card>
          <div className="record-grid">
            <Card>
              <h2>Dados clínicos deste atendimento</h2>
              {clinical === null ? <EmptyState>Dados clínicos não registrados.</EmptyState> : <Fields items={[
                ['Altura', formatNumeric(clinical.alturaCm, 'cm')], ['Peso', formatNumeric(clinical.pesoKg, 'kg')],
                ['Circunferência abdominal', formatNumeric(clinical.circunferenciaAbdominalCm, 'cm')],
                ['Frequência cardíaca', formatNumeric(clinical.frequenciaCardiacaBpm, 'bpm')],
                ['Saturação', formatNumeric(clinical.saturacaoPercentual, '%')],
                ['PA sistólica', formatNumeric(clinical.paSistolicaMmhg, 'mmHg')],
                ['PA diastólica', formatNumeric(clinical.paDiastolicaMmhg, 'mmHg')],
                ['NYHA', clinicalLabel(clinical.nyha)], ['Observações', displayText(clinical.observacoes)],
              ]} />}
            </Card>
            <Card>
              <h2>Diagnóstico de Chagas deste atendimento</h2>
              {diagnosis === null ? <EmptyState>Diagnóstico não registrado neste atendimento.</EmptyState> : <Fields items={[
                ['Possui diagnóstico', triState(diagnosis.possuiDiagnosticoChagas)],
                ['Status', clinicalLabel(diagnosis.statusDiagnostico)], ['Resultado final', clinicalLabel(diagnosis.resultadoFinal)],
                ['Data do resultado final', formatClinicalDate(diagnosis.dataResultadoFinal)],
                ['Descoberta por autorrelato', formatClinicalDate(diagnosis.dataDescobertaAutorelato)],
                ['Critério de confirmação', clinicalLabel(diagnosis.criterioConfirmacao)], ['Observações', displayText(diagnosis.observacoes)],
              ]} />}
            </Card>
          </div>
          <Card>
            <h2>Coleções deste atendimento</h2>
            <p className="muted">A paginação abaixo avança exames, pendências, rastreios e familiares em conjunto.</p>
            <h3>Exames desta página ({data.exames.length})</h3>
            {data.exames.length === 0 ? <EmptyState>Nenhum exame nesta página.</EmptyState> : <ExamList rows={data.exames} pacienteId={pacienteId} />}
            <h3>Pendências desta página ({data.pendencias.length})</h3>
            {data.pendencias.length === 0 ? <EmptyState>Nenhuma pendência nesta página.</EmptyState> : (
              <div className="resource-list">{data.pendencias.map(item => <article className="resource-item" key={item.pendenciaId}>
                <h4>{displayText(item.descricao)}</h4>
                <Fields items={[
                  ['ID da pendência', <span className="mono">{item.pendenciaId}</span>],
                  ['Status', clinicalLabel(item.status)], ['Identificada em', formatClinicalDate(item.dataIdentificacao)],
                ]} />
              </article>)}</div>
            )}
            <h3>Rastreios familiares desta página ({families.length})</h3>
            {families.length === 0 ? <EmptyState>Nenhum rastreio nesta página.</EmptyState> : <FamilyScreenings rows={families} />}
            <Pagination label="coleções do atendimento" {...data.paginacaoColecoes} count={collectionLength} showCount={false} onChange={page.changePage} />
          </Card>
        </>;
      }}
    </QueryState>
  </>;
}
