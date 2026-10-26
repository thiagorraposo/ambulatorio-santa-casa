import { Link, useLocation, useParams } from 'react-router';
import type { AtendimentoDetalheResponse } from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import { Card, EmptyState, PageHeading, QueryState } from '../../shared/ui';
import { clinicalLabel, displayText, formatClinicalDate, triState } from '../../shared/formatters';
import { ExamList, Fields } from './components';
import { pagePath, Pagination, usePage } from './pagination';
import { useSession } from '../../app/session';
import ClinicalActions from '../clinical/ClinicalActions';
import { AttendanceFamilies } from './PatientResources';
import { AttendanceChagasDiagnosis, AttendanceClinicalAssessment } from './AttendanceClinicalPanels';

export default function AttendancePage() {
  const session = useSession();
  const location = useLocation();
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
        const collectionLength = Math.max(data.exames.length, data.pendencias.length);
        return <>
          <Card>
            <h2>Atendimento de {formatClinicalDate(data.dataAtendimento)}</h2>
            {location.state?.saved && <p className="notice" role="status">{String(location.state.saved)}</p>}
            {session.user?.perfil !== 'consulta' && <div className="form-actions">
              <Link to={`${patientPath}/atendimentos/${atendimentoId}/editar`} className="button button-secondary">Editar atendimento</Link>
              <Link to={`${patientPath}/registrar?tipo=bzn&atendimentoId=${encodeURIComponent(atendimentoId)}&retorno=${encodeURIComponent(location.pathname + location.search + location.hash)}`} className="button button-secondary">Registrar acompanhamento</Link>
            </div>}
            <Fields items={[
              ['ID do atendimento', <span className="mono">{data.atendimentoId}</span>],
              ['Localização do prontuário', displayText(data.localizacaoProntuario)],
              ['Unicamente pelo ambulatório', triState(data.ambulatorioUnicamente)],
              ['Ambulatório anexo a projeto', triState(data.ambulatorioAnexoProjeto)],
              ['Observações', displayText(data.observacoes)],
            ]} />
          </Card>
          <div className="record-grid">
            <AttendanceClinicalAssessment clinical={data.dadosClinicos} />
            <AttendanceChagasDiagnosis diagnosis={data.diagnosticoChagas} />
          </div>
          <Card>
            <h2>Coleções deste atendimento</h2>
            <p className="muted">A paginação abaixo avança exames e pendências. Rastreios familiares têm controles próprios.</p>
            <h3>Exames desta página ({data.exames.length})</h3>
            {data.exames.length === 0 ? <EmptyState>Nenhum exame nesta página.</EmptyState> : <ExamList rows={data.exames} pacienteId={pacienteId} />}
            <h3>Pendências desta página ({data.pendencias.length})</h3>
            {data.pendencias.length === 0 ? <EmptyState>Nenhuma pendência nesta página.</EmptyState> : (
              <div className="resource-list">{data.pendencias.map(item => <article className="resource-item" key={item.pendenciaId}>
                <h4>{displayText(item.descricao)}</h4>
                <Fields items={[
                  ['ID da pendência', <span className="mono">{item.pendenciaId}</span>],
                  ['Status', clinicalLabel(item.status)], ['Identificada em', formatClinicalDate(item.dataIdentificacao)],
                  ['Resolvida em', formatClinicalDate(item.dataResolucao)],
                ]} />
              </article>)}</div>
            )}
            <Pagination label="coleções do atendimento" {...data.paginacaoColecoes} count={collectionLength} showCount={false} onChange={page.changePage} />
          </Card>
          <AttendanceFamilies path={`${patientPath}/atendimentos/${encodeURIComponent(atendimentoId)}`} />
          <ClinicalActions pacienteId={pacienteId} atendimentoId={atendimentoId} />
        </>;
      }}
    </QueryState>
  </>;
}
