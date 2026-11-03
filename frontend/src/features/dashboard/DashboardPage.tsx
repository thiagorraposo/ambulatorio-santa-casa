import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ApiError } from '../../api/client';
import { useApiQuery } from '../../api/useApiQuery';
import { ApiErrorState, Card, PageHeading, QueryState } from '../../shared/ui';
import { dashboardCards, defaultDashboardPeriod, displayDashboardDate, validDashboardPeriod, validDashboardResponse, type DashboardResponse } from './dashboard-model';

export default function DashboardPage({ title = 'Início' }: { title?: 'Início' | 'Dashboard' }) {
  const [params, setParams] = useSearchParams();
  const defaults = defaultDashboardPeriod();
  const inicio = params.get('inicio') ?? defaults.inicio;
  const fim = params.get('fim') ?? defaults.fim;
  const [draft, setDraft] = useState({ inicio, fim });
  const [filterError, setFilterError] = useState('');
  useEffect(() => { setDraft({ inicio, fim }); setFilterError(''); }, [inicio, fim]);
  const query = useApiQuery<DashboardResponse>(`/dashboard?${new URLSearchParams({ inicio, fim })}`);
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validDashboardPeriod(draft.inicio, draft.fim)) { setFilterError('Informe datas válidas em ordem crescente, em um intervalo de até 367 dias.'); return; }
    setFilterError('');
    if (draft.inicio === inicio && draft.fim === fim) { void query.refetch(); return; }
    setParams(previous => { const next = new URLSearchParams(previous); next.set('inicio', draft.inicio); next.set('fim', draft.fim); return next; });
  }
  return <div className="dashboard-page">
    <PageHeading title={title} description="Resumo operacional do Ambulatório Santa Casa, conforme seu acesso atual." />
    <p className="muted dashboard-scope">Indicadores operacionais; não são calculados scores ou recomendações clínicas.</p>
    <div className="dashboard-heading"><h2>Indicadores do ambulatório</h2><button className="button button-secondary" disabled={query.isFetching} onClick={() => void query.refetch()}>Atualizar indicadores</button></div>
    <Card className="dashboard-filters"><form aria-label="Filtrar indicadores" onSubmit={apply}>
      <div className="form-field"><label htmlFor="dashboard-inicio">Data inicial</label><input id="dashboard-inicio" type="date" required value={draft.inicio} onChange={event => setDraft({ ...draft, inicio: event.target.value })} /></div>
      <div className="form-field"><label htmlFor="dashboard-fim">Data final</label><input id="dashboard-fim" type="date" required value={draft.fim} onChange={event => setDraft({ ...draft, fim: event.target.value })} /></div>
      <button className="button" disabled={query.isFetching}>Aplicar período</button>
    </form>
    <p className="muted">Datas inicial e final inclusivas. O período filtra atendimentos e lotes; pacientes e pendências representam a situação atual.</p>
    {filterError && <p className="error-state" role="alert">{filterError}</p>}</Card>
    <QueryState query={query}>{data => !validDashboardResponse(data) ? <ApiErrorState error={new ApiError(502)} retry={() => void query.refetch()} /> : <>
      <p className="dashboard-period">Período aplicado: <strong>{displayDashboardDate(data.periodo.inicio)} a {displayDashboardDate(data.periodo.fim)}</strong>. Atualizado em <time dateTime={data.atualizadoEm}>{new Date(data.atualizadoEm).toLocaleString('pt-BR')}</time>.</p>
      <div className="dashboard-cards">{dashboardCards.map(({ key, title }) => {
        const indicator = data.indicadores[key];
        return <Card key={key} className={`dashboard-indicator dashboard-indicator-${key}`}>
          <div role="group" aria-labelledby={`dashboard-${key}-title`}>
            <h3 id={`dashboard-${key}-title`}>{title}</h3>
            {indicator.estado === 'sem_permissao' ? <><p className="dashboard-no-access">Sem permissão</p><p className="muted">Este indicador não está disponível para seu acesso.</p></>
              : <><p className="dashboard-value" aria-label={`${title}: ${indicator.valor!.toLocaleString('pt-BR')}`}>{indicator.valor!.toLocaleString('pt-BR')}</p>
                {indicator.valor === 0 && <p className="muted">Nenhum registro no recorte autorizado.</p>}</>}
            <p className="dashboard-context">{indicator.periodoAplicado ? 'No período selecionado' : 'Situação atual · todos os períodos'}</p>
            <details><summary>Como este indicador é calculado</summary><p>{indicator.definicao}</p></details>
          </div>
        </Card>;
      })}</div>
    </>}</QueryState>
    <div className="home-grid dashboard-shortcuts">
      <Card><span className="section-label">REGISTROS DO AMBULATÓRIO</span><h2>Consulte a ficha do paciente</h2><p>Busque por nome ou sexo para abrir dados pessoais, atendimentos e acompanhamento.</p><Link to="/pacientes" className="button">Consultar pacientes <span aria-hidden="true">→</span></Link></Card>
      <Card><span className="section-label">SEU ACESSO</span><h2>Minha conta</h2><p>Confira sua identificação e o perfil de acesso informado pelo serviço.</p><Link to="/minha-conta" className="button button-secondary">Ver minha conta</Link></Card>
    </div>
  </div>;
}
