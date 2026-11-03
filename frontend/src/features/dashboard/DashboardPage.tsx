import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ApiError } from '../../api/client';
import { useApiQuery } from '../../api/useApiQuery';
import { ApiErrorState, Card, EmptyState, PageHeading, QueryState, TableScroll } from '../../shared/ui';
import { Pagination, usePage } from '../pacientes/pagination';
import DashboardCsvExport from './DashboardCsvExport';
import { dashboardCards, defaultDashboardPeriod, displayDashboardDate, validDashboardPeriod, validDashboardResponse, type DashboardResponse } from './dashboard-model';

const filterLabels = { nome: 'Nome', pacienteId: 'ID do paciente', sexo: 'Sexo', projetoId: 'Projeto', statusPendencia: 'Status da pendência' };
const descriptions: Record<string, string> = { feminino: 'Feminino', masculino: 'Masculino', outro: 'Outro', nao_informado: 'Não informado', aberta: 'Aberta', em_andamento: 'Em andamento', resolvida: 'Resolvida' };
export default function DashboardPage({ title = 'Dashboard' }: { title?: 'Dashboard' }) {
  const [params, setParams] = useSearchParams();
  const page = usePage();
  const defaults = defaultDashboardPeriod();
  const applied = { inicio: params.get('inicio') ?? defaults.inicio, fim: params.get('fim') ?? defaults.fim,
    nome: params.get('nome') ?? '', pacienteId: params.get('pacienteId') ?? '', sexo: params.get('sexo') ?? '',
    projetoId: params.get('projetoId') ?? '', statusPendencia: params.get('statusPendencia') ?? '', ordenacao: params.get('ordenacao') ?? 'data_desc' };
  const appliedKey = JSON.stringify(applied);
  const [draft, setDraft] = useState(applied);
  const [filterError, setFilterError] = useState('');
  useEffect(() => { setDraft(JSON.parse(appliedKey) as typeof applied); setFilterError(''); }, [appliedKey]);
  const filters = new URLSearchParams();
  for (const [key, value] of Object.entries(applied)) if (value) filters.set(key, value);
  const query = useApiQuery<DashboardResponse>(`/dashboard?${filters}&limit=${page.limit}&offset=${page.offset}`);
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validDashboardPeriod(draft.inicio, draft.fim)) { setFilterError('Informe datas válidas em ordem crescente, em um intervalo de até 367 dias.'); return; }
    setFilterError('');
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(draft)) if (value.trim()) next.set(key, value.trim());
    next.set('limit', String(page.limit)); next.set('offset', '0');
    setParams(next);
    if (JSON.stringify(draft) === appliedKey && page.offset === 0) void query.refetch();
  }
  const available = query.isSuccess && !query.isFetching && validDashboardResponse(query.data);
  const projects = available ? query.data.projetos ?? [] : [];
  const resultReturn = `/dashboard?${filters}&limit=${page.limit}&offset=${page.offset}`;
  return <div className="dashboard-page">
    <PageHeading title={title} description="Analise os registros autorizados, combine filtros e exporte os atendimentos encontrados." actions={<button className="button button-secondary" disabled={query.isFetching} onClick={() => void query.refetch()}>Atualizar indicadores</button>} />
    <Card className="dashboard-filters"><h2>Filtros da análise</h2><form aria-label="Filtrar indicadores" onSubmit={apply}>
      <div className="form-field"><label htmlFor="dashboard-inicio">Data inicial</label><input id="dashboard-inicio" type="date" required value={draft.inicio} onChange={event => setDraft({ ...draft, inicio: event.target.value })} /></div>
      <div className="form-field"><label htmlFor="dashboard-fim">Data final</label><input id="dashboard-fim" type="date" required value={draft.fim} onChange={event => setDraft({ ...draft, fim: event.target.value })} /></div>
      <div className="form-field"><label htmlFor="dashboard-nome">Nome do paciente</label><input id="dashboard-nome" type="search" maxLength={120} placeholder="Buscar por nome" value={draft.nome} onChange={event => setDraft({ ...draft, nome: event.target.value })} /></div>
      <div className="form-field"><label htmlFor="dashboard-paciente">ID do paciente</label><input id="dashboard-paciente" inputMode="numeric" pattern="[1-9][0-9]*" maxLength={19} value={draft.pacienteId} onChange={event => setDraft({ ...draft, pacienteId: event.target.value })} /></div>
      <div className="form-field"><label htmlFor="dashboard-sexo">Sexo</label><select id="dashboard-sexo" value={draft.sexo} onChange={event => setDraft({ ...draft, sexo: event.target.value })}><option value="">Todos</option>{['feminino', 'masculino', 'outro', 'nao_informado'].map(value => <option key={value} value={value}>{descriptions[value]}</option>)}</select></div>
      <div className="form-field"><label htmlFor="dashboard-projeto">Projeto</label><select id="dashboard-projeto" value={draft.projetoId} onChange={event => setDraft({ ...draft, projetoId: event.target.value })}><option value="">Todos</option>{projects.map(project => <option key={project.projetoId} value={project.projetoId}>{project.nome}</option>)}{draft.projetoId && !projects.some(project => project.projetoId === draft.projetoId) && <option value={draft.projetoId}>Projeto {draft.projetoId}</option>}</select></div>
      <div className="form-field"><label htmlFor="dashboard-status">Status da pendência</label><select id="dashboard-status" value={draft.statusPendencia} onChange={event => setDraft({ ...draft, statusPendencia: event.target.value })}><option value="">Todos</option>{['aberta', 'em_andamento', 'resolvida'].map(value => <option key={value} value={value}>{descriptions[value]}</option>)}</select></div>
      <div className="form-field"><label htmlFor="dashboard-ordem">Ordenação</label><select id="dashboard-ordem" value={draft.ordenacao} onChange={event => setDraft({ ...draft, ordenacao: event.target.value })}><option value="data_desc">Mais recentes</option><option value="data_asc">Mais antigos</option><option value="nome_asc">Nome do paciente</option></select></div>
      <div className="form-actions dashboard-filter-actions"><button className="button" disabled={query.isFetching}>Aplicar filtros</button><button type="button" className="button button-secondary" onClick={() => { setParams({ ...defaults, limit: String(page.limit), offset: '0' }); setDraft({ ...applied, ...defaults, nome: '', pacienteId: '', sexo: '', projetoId: '', statusPendencia: '', ordenacao: 'data_desc' }); setFilterError(''); }}>Limpar filtros</button></div>
    </form>
    <p className="muted">Período inclusivo para atendimentos e lotes. Nome, ID, sexo, projeto e pendência selecionam pacientes; pendências de qualquer data e participação registrada em projeto. Pacientes e pendências abertas retratam a situação atual. Lotes usam apenas período e autorização própria.</p>
    {Object.entries(filterLabels).some(([key]) => params.get(key)) && <div className="dashboard-active-filters" aria-label="Filtros aplicados">{Object.entries(filterLabels).map(([key, label]) => params.get(key) && <button key={key} type="button" className="button button-secondary" aria-label={`Remover filtro: ${label}`} onClick={() => setParams(previous => { const next = new URLSearchParams(previous); next.delete(key); next.set('offset', '0'); return next; })}>{label}: {key === 'projetoId' ? projects.find(project => project.projetoId === params.get(key))?.nome ?? params.get(key) : descriptions[params.get(key)!] ?? params.get(key)} <span aria-hidden="true">×</span></button>)}</div>}
    {filterError && <p className="error-state" role="alert">{filterError}</p>}</Card>
    <QueryState query={query}>{data => !validDashboardResponse(data) ? <ApiErrorState error={new ApiError(502)} retry={() => void query.refetch()} /> : <>
      <p className="dashboard-period">Período aplicado: <strong>{displayDashboardDate(data.periodo.inicio)} a {displayDashboardDate(data.periodo.fim)}</strong>. Atualizado em <time dateTime={data.atualizadoEm}>{new Date(data.atualizadoEm).toLocaleString('pt-BR')}</time>.</p>
      <div className="dashboard-cards">{dashboardCards.map(({ key, title: label }) => {
        const indicator = data.indicadores[key];
        return <Card key={key} className={`dashboard-indicator dashboard-indicator-${key}`}><div role="group" aria-labelledby={`dashboard-${key}-title`}><h2 id={`dashboard-${key}-title`}>{label}</h2>
          {indicator.estado === 'sem_permissao' ? <><p className="dashboard-no-access">Sem permissão</p><p className="muted">Este indicador não está disponível para seu acesso.</p></> : <><p className="dashboard-value" aria-label={`${label}: ${indicator.valor!.toLocaleString('pt-BR')}`}>{indicator.valor!.toLocaleString('pt-BR')}</p>{indicator.valor === 0 && <p className="muted">Nenhum registro no recorte autorizado.</p>}</>}
          <p className="dashboard-context">{indicator.periodoAplicado ? 'No período selecionado' : 'Situação atual · todos os períodos'}</p><details><summary>Como este indicador é calculado</summary><p>{indicator.definicao}</p></details>
        </div></Card>;
      })}</div>
      <Card className="dashboard-series"><h2>Atendimentos por mês</h2><p className="muted">Mesma população e período dos resultados. A tabela apresenta os valores do gráfico.</p>
        {data.serieAtendimentos?.length ? <><div className="dashboard-chart" tabIndex={0} role="img" aria-label="Gráfico de atendimentos por mês; valores na tabela a seguir">{data.serieAtendimentos.map(item => <div className="dashboard-chart-column" key={item.mes}><span>{item.total}</span><div className="dashboard-chart-track"><span style={{ height: `${Math.max(2, item.total / Math.max(1, ...data.serieAtendimentos.map(row => row.total)) * 100)}%` }} /></div><span>{item.mes.split('-').reverse().join('/')}</span></div>)}</div><details><summary>Ver tabela de atendimentos por mês</summary><TableScroll label="Série mensal"><table className="data-table"><caption className="sr-only">Atendimentos por mês</caption><thead><tr><th scope="col">Mês</th><th scope="col">Atendimentos</th></tr></thead><tbody>{data.serieAtendimentos.map(item => <tr key={item.mes}><th scope="row">{item.mes.split('-').reverse().join('/')}</th><td>{item.total}</td></tr>)}</tbody></table></TableScroll></details></> : <EmptyState>Nenhum atendimento no período e nos filtros aplicados.</EmptyState>}
      </Card>
      <Card className="dashboard-results"><div className="dashboard-heading"><div><h2>Atendimentos encontrados</h2><p className="muted">{data.paginacao?.total ?? 0} resultados autorizados · a ordenação “Mais recentes” mostra a atividade pela data do atendimento.</p></div><DashboardCsvExport key={filters.toString()} filters={filters.toString()} total={data.paginacao?.total ?? 0} available={available} /></div>
        {!data.resultados?.length ? <EmptyState>Nenhum atendimento nesta página. Ajuste os filtros ou volte à primeira página.</EmptyState> : <TableScroll label="Resultados do dashboard"><table className="data-table dashboard-results-table"><caption className="sr-only">Atendimentos encontrados</caption><thead><tr><th scope="col">Paciente</th><th scope="col">Data do atendimento</th><th scope="col">Pendências abertas</th><th scope="col">Ações</th></tr></thead><tbody>{data.resultados.map(row => { const patientPath = `/pacientes/${encodeURIComponent(row.pacienteId)}`; const origin = `${patientPath}?${new URLSearchParams({ aba: 'atendimentos', retorno: resultReturn })}`; return <tr key={row.atendimentoId}><td data-label="Paciente"><strong>{row.nome}</strong><small className="muted">ID {row.pacienteId}</small></td><td data-label="Data">{displayDashboardDate(row.dataAtendimento)}</td><td data-label="Pendências abertas">{row.pendenciasAbertas}</td><td data-label="Ações"><div className="patient-row-actions"><Link aria-label={`Ver atendimento de ${row.nome}`} to={`${patientPath}/atendimentos/${encodeURIComponent(row.atendimentoId)}?${new URLSearchParams({ retorno: origin })}`}>Ver atendimento</Link><Link aria-label={`Ver ficha de ${row.nome}`} to={`${patientPath}?${new URLSearchParams({ retorno: resultReturn })}`}>Ver ficha</Link></div></td></tr>; })}</tbody></table></TableScroll>}
        <Pagination label="resultados do dashboard" {...page} onChange={page.changePage} count={data.resultados?.length} hasNext={page.offset + page.limit < (data.paginacao?.total ?? 0)} showCount={false} />
      </Card>
    </>}</QueryState>
    <p className="dashboard-records-link"><Link to="/pacientes">Consultar pacientes</Link> para abrir fichas e históricos completos.</p>
  </div>;
}
