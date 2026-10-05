import { Link, useParams, useSearchParams } from 'react-router';
import type { PacienteDetalheResponse } from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import { Card, EmptyState, PageHeading, QueryState } from '../../shared/ui';
import { clinicalLabel, displayText, formatAge, formatClinicalDate, triState } from '../../shared/formatters';
import { AttendanceLink, Fields } from './components';
import { pagePath, Pagination, usePage } from './pagination';
import {
  AttendanceHistory, PatientAnnualFollowup, PatientBzn, PatientExams, PatientNotification,
  PatientPending, PatientProjects, PatientReferrals,
} from './PatientResources';

const sections = [
  ['dados', 'Dados do paciente'], ['atendimentos', 'Atendimentos'], ['exames', 'Exames'],
  ['bzn', 'BZN e retornos'], ['projetos', 'Projetos'], ['notificacao', 'Notificação'],
  ['encaminhamentos', 'Encaminhamentos'], ['pendencias', 'Pendências'], ['acompanhamento', 'Acompanhamento anual'],
] as const;

function PatientData({ data, changePage }: { data: PacienteDetalheResponse; changePage: (offset: number, limit?: number) => void }) {
  return <Card>
    <h2>Dados do paciente</h2>
    <Fields items={[
      ['Nascimento', formatClinicalDate(data.dataNascimento)], ['Sexo', clinicalLabel(data.sexo)],
      ['Raça', clinicalLabel(data.raca)], ['Comunidade tradicional', triState(data.pertenceComunidadeTradicional)],
      ['Tipo de comunidade', displayText(data.tipoComunidadeTradicional)],
      ['Endereço', displayText(data.endereco?.endereco)], ['Cidade', displayText(data.endereco?.cidade)],
    ]} />
    <h3>Telefones desta página</h3>
    {data.telefones.length === 0 ? <EmptyState>Nenhum telefone nesta página.</EmptyState> : (
      <ul>{data.telefones.map((phone, index) => <li key={`${index}-${phone}`}>{displayText(phone)}</li>)}</ul>
    )}
    <h3>Atendimentos desta página</h3>
    {data.atendimentos.length === 0 ? <EmptyState>Nenhum atendimento nesta página.</EmptyState> : (
      <div className="resource-list">{data.atendimentos.map(item => <article className="resource-item" key={item.atendimentoId}>
        <AttendanceLink pacienteId={data.pacienteId} atendimentoId={item.atendimentoId} />
        <p>{formatClinicalDate(item.dataAtendimento)}</p>
        <p>{displayText(item.observacoes)}</p>
      </article>)}</div>
    )}
    <p className="muted">Telefones e atendimentos usam a mesma página nesta consulta. Consulte também o histórico na aba Atendimentos.</p>
    <Pagination label="coleções dos dados do paciente" {...data.paginacaoColecoes}
      count={Math.max(data.telefones.length, data.atendimentos.length)} showCount={false} onChange={changePage} />
  </Card>;
}

function PatientSection({ section, pacienteId, path, data, changePage }: {
  section: string;
  pacienteId: string;
  path: string;
  data: PacienteDetalheResponse;
  changePage: (offset: number, limit?: number) => void;
}) {
  switch (section) {
    case 'dados': return <PatientData data={data} changePage={changePage} />;
    case 'atendimentos': return <AttendanceHistory pacienteId={pacienteId} path={path} />;
    case 'exames': return <PatientExams pacienteId={pacienteId} path={path} />;
    case 'bzn': return <PatientBzn pacienteId={pacienteId} path={path} />;
    case 'projetos': return <PatientProjects path={path} />;
    case 'notificacao': return <PatientNotification path={path} />;
    case 'encaminhamentos': return <PatientReferrals pacienteId={pacienteId} path={path} />;
    case 'pendencias': return <PatientPending pacienteId={pacienteId} path={path} />;
    case 'acompanhamento': return <PatientAnnualFollowup pacienteId={pacienteId} path={path} />;
    default: return <Card><EmptyState>Esta seção não está disponível. Abra uma das seções da ficha.</EmptyState></Card>;
  }
}

export default function PatientPage() {
  const { pacienteId = '' } = useParams<{ pacienteId: string }>();
  const [searchParams] = useSearchParams();
  const section = searchParams.get('aba') ?? 'dados';
  const page = usePage('dados');
  const path = `/pacientes/${encodeURIComponent(pacienteId)}`;
  const query = useApiQuery<PacienteDetalheResponse>(pagePath(path, page.limit, page.offset));
  return <>
    <nav className="breadcrumb" aria-label="Caminho da página"><Link to="/pacientes">Pacientes</Link><span>Ficha do paciente</span></nav>
    <PageHeading title="Ficha do paciente" />
    <QueryState query={query}>
      {data => <>
        <Card className="patient-summary">
          <h2>{data.nome}</h2>
          <p>ID <span className="mono">{data.pacienteId}</span></p>
          <p>{formatAge(data.idade, data.dataReferenciaIdade)}</p>
          <span className="badge">Consulta</span>
        </Card>
        <nav className="record-nav" aria-label="Seções da ficha">
          {sections.map(([value, label]) => {
            const next = new URLSearchParams(searchParams);
            next.set('aba', value);
            return <Link key={value} to={{ search: `?${next}` }} aria-current={section === value ? 'page' : undefined}>{label}</Link>;
          })}
        </nav>
        <PatientSection key={`${pacienteId}-${section}`} section={section} pacienteId={pacienteId} path={path} data={data} changePage={page.changePage} />
      </>}
    </QueryState>
  </>;
}
