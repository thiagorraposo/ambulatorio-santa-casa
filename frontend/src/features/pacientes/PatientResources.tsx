import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import type {
  AnnualReturnResponse, AtendimentoResumoResponse, ClinicalEventResponse, CounterReferralResponse,
  ExameResponse, NotificationResponse, PendenciaResponse, ProjectResponse, ReferralResponse,
  RetornoBznResponse, TratamentoBznResponse, RastreioFamiliarResponse,
} from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import { Card, EmptyState, QueryState } from '../../shared/ui';
import { clinicalLabel, displayText, formatClinicalDate, formatNumeric, triState } from '../../shared/formatters';
import { AttendanceLink, Collection, ExamList, Fields } from './components';
import { pagePath, Pagination, usePage } from './pagination';

function FamilyResults({ path, snapshot }: { path: string; snapshot: RastreioFamiliarResponse }) {
  const page = usePage(`familiares${snapshot.rastreioFamiliarId}`);
  const query = useApiQuery<RastreioFamiliarResponse>(pagePath(
    `${path}/${encodeURIComponent(snapshot.rastreioFamiliarId)}/familiares`, page.limit, page.offset));
  const content = useRef<HTMLDivElement>(null);
  const previousPage = useRef(`${page.limit}:${page.offset}`);
  const needsFocus = useRef(false);
  useEffect(() => {
    const key = `${page.limit}:${page.offset}`;
    if (previousPage.current !== key) needsFocus.current = true;
    previousPage.current = key;
    if (needsFocus.current && !query.isFetching && !query.isPending) {
      content.current?.focus();
      needsFocus.current = false;
    }
  }, [page.limit, page.offset, query.isFetching, query.isPending]);
  return <div ref={content} role="region" tabIndex={-1} aria-label={`Resultados do rastreio ${snapshot.rastreioFamiliarId}`}>
    <QueryState query={query}>
      {data => data.familiares.length === 0 ? <EmptyState>Nenhum familiar nesta página do rastreio.</EmptyState> : (
        <div className="table-scroll"><table className="data-table">
          <caption>Familiares desta página do rastreio {snapshot.rastreioFamiliarId}</caption>
          <thead><tr><th scope="col">Identificação do familiar</th><th scope="col">Resultado de sorologia</th></tr></thead>
          <tbody>{data.familiares.map(family => <tr key={family.resultadoId}>
            <td>{displayText(family.identificacaoFamiliar)}</td><td>{clinicalLabel(family.resultadoSorologia)}</td>
          </tr>)}</tbody>
        </table></div>
      )}
    </QueryState>
    <Pagination label={`familiares do rastreio ${snapshot.rastreioFamiliarId}`} {...page}
      count={query.isSuccess && !query.isFetching ? query.data.familiares.length : undefined} onChange={page.changePage} />
  </div>;
}

export function AttendanceFamilies({ path }: { path: string }) {
  const page = usePage('familiares');
  const query = useApiQuery<RastreioFamiliarResponse[]>(pagePath(`${path}/rastreios-familiares`, page.limit, page.offset));
  const heading = useRef<HTMLHeadingElement>(null);
  const previousPage = useRef(`${page.limit}:${page.offset}`);
  const needsFocus = useRef(false);
  useEffect(() => {
    const key = `${page.limit}:${page.offset}`;
    if (previousPage.current !== key) needsFocus.current = true;
    previousPage.current = key;
    if (needsFocus.current && !query.isFetching && !query.isPending) {
      heading.current?.focus();
      needsFocus.current = false;
    }
  }, [page.limit, page.offset, query.isFetching, query.isPending]);
  return <Card>
    <h2 ref={heading} tabIndex={-1}>Rastreios familiares deste atendimento</h2>
    <p className="muted">Cada rastreio conserva os familiares informados naquela consulta. As páginas de rastreios e de familiares são independentes.</p>
    <QueryState query={query}>
      {rows => rows.length === 0 ? <EmptyState>Nenhum rastreio nesta página.</EmptyState> : rows.map(snapshot => (
        <article className="resource-item" key={snapshot.rastreioFamiliarId}>
          <h3>Rastreio <span className="mono">{snapshot.rastreioFamiliarId}</span></h3>
          <Fields items={[['Familiares examinados', triState(snapshot.familiaresExaminados)]]} />
          <FamilyResults path={`${path}/rastreios-familiares`} snapshot={snapshot} />
        </article>
      ))}
    </QueryState>
    <Pagination label="rastreios familiares" {...page}
      count={query.isSuccess && !query.isFetching ? query.data.length : undefined} onChange={page.changePage} />
  </Card>;
}

export function AttendanceHistory({ pacienteId, path }: { pacienteId: string; path: string }) {
  return <Collection<AtendimentoResumoResponse> title="Histórico de atendimentos" path={`${path}/atendimentos`} pageScope="atendimentos">
    {rows => <div className="table-scroll"><table className="data-table">
      <caption className="sr-only">Atendimentos desta página</caption>
      <thead><tr><th scope="col">Data</th><th scope="col">Atendimento</th><th scope="col">Localização do prontuário</th><th scope="col">Observações</th></tr></thead>
      <tbody>{rows.map(item => <tr key={item.atendimentoId}>
        <td>{formatClinicalDate(item.dataAtendimento)}</td>
        <td><AttendanceLink pacienteId={pacienteId} atendimentoId={item.atendimentoId} /></td>
        <td>{displayText(item.localizacaoProntuario)}</td><td>{displayText(item.observacoes)}</td>
      </tr>)}</tbody>
    </table></div>}
  </Collection>;
}

export function PatientExams({ pacienteId, path }: { pacienteId: string; path: string }) {
  return <Collection<ExameResponse> title="Exames" path={`${path}/exames`} pageScope="exames">
    {rows => <ExamList rows={rows} pacienteId={pacienteId} />}
  </Collection>;
}

export function PatientProjects({ path }: { path: string }) {
  return <Collection<ProjectResponse> title="Projetos" path={`${path}/projetos`} pageScope="projetos">
    {rows => <div className="resource-list">{rows.map(item => <article className="resource-item" key={item.projetoId}>
      <h3>{item.nome}</h3>
      <Fields items={[
        ['ID do projeto', <span className="mono">{item.projetoId}</span>], ['Código', item.codigo],
        ['Participa', triState(item.participa)], ['Possui pendência', triState(item.possuiPendencia)],
        ['Descrição da pendência', displayText(item.descricaoPendencia)], ['Houve falha', triState(item.houveFalha)],
        ['Descrição da falha', displayText(item.descricaoFalha)], ['Observações', displayText(item.observacoes)],
      ]} />
    </article>)}</div>}
  </Collection>;
}

export function PatientNotification({ path }: { path: string }) {
  const query = useApiQuery<NotificationResponse | null>(`${path}/notificacao`);
  return <Card>
    <h2>Notificação</h2>
    <QueryState query={query} emptyMessage="Notificação não registrada.">
      {item => item === null ? <EmptyState>Notificação não registrada.</EmptyState> : <Fields items={[
        ['ID da notificação', <span className="mono">{item.notificacaoId}</span>],
        ['Paciente notificado', triState(item.pacienteNotificado)],
        ['Número da notificação', displayText(item.numeroNotificacao)],
        ['Justificativa de não notificação', displayText(item.justificativaNaoNotificacao)],
        ['Observações', displayText(item.observacoes)],
      ]} />}
    </QueryState>
  </Card>;
}

export function PatientBzn({ pacienteId, path }: { pacienteId: string; path: string }) {
  const query = useApiQuery<TratamentoBznResponse | null>(`${path}/tratamento-bzn`);
  return <div className="record-grid">
    <Card>
      <h2>Tratamento com benzonidazol (BZN)</h2>
      <QueryState query={query} emptyMessage="Tratamento BZN não registrado.">
        {item => item === null ? <EmptyState>Tratamento BZN não registrado.</EmptyState> : <>
          <Fields items={[
            ['ID do tratamento', <span className="mono">{item.tratamentoId}</span>],
            ['Atendimento', <AttendanceLink pacienteId={pacienteId} atendimentoId={item.atendimentoId} />],
            ['Tem indicação', triState(item.temIndicacao)], ['Iniciado', triState(item.iniciado)],
            ['Tratamento pelo ambulatório', triState(item.tratamentoPeloAmbulatorio)],
            ['Duração cumprida', formatNumeric(item.duracaoCumpridaDias, 'dias')],
            ['Ano de uso aproximado', displayText(item.anoUsoAproximado)],
            ['Data de prescrição', formatClinicalDate(item.dataPrescricao)],
            ['Motivo de não indicação', displayText(item.motivoNaoIndicacao)],
            ['Motivo de não início', displayText(item.motivoNaoInicio)],
            ['Teve reação adversa', triState(item.teveReacaoAdversa)], ['Observações', displayText(item.observacoes)],
          ]} />
          <h3>Reações adversas registradas</h3>
          {item.reacoes.length === 0 ? <EmptyState>Nenhuma reação registrada.</EmptyState> : (
            <div className="resource-list">{item.reacoes.map(reaction => <details className="resource-item" key={reaction.reacaoId}>
              <summary>{reaction.descricao}</summary>
              <Fields items={[
                ['ID da reação', <span className="mono">{reaction.reacaoId}</span>],
                ['Data', formatClinicalDate(reaction.dataReacao)], ['Gravidade', clinicalLabel(reaction.gravidade)],
                ['Consequência', displayText(reaction.consequencia)], ['Observações', displayText(reaction.observacoes)],
              ]} />
            </details>)}</div>
          )}
        </>}
      </QueryState>
    </Card>
    <Collection<RetornoBznResponse> title="Retornos BZN" path={`${path}/retornos-bzn`} pageScope="bznRetornos">
      {rows => <div className="resource-list">{rows.map(item => <article className="resource-item" key={item.retornoId}>
        <h3>Retorno de {formatClinicalDate(item.dataRealizada)}</h3>
        <Fields items={[
          ['ID do retorno', <span className="mono">{item.retornoId}</span>],
          ['Atendimento', <AttendanceLink pacienteId={pacienteId} atendimentoId={item.atendimentoId} />],
          ['Tipo', clinicalLabel(item.tipo)], ['Status', clinicalLabel(item.status)], ['Resumo', displayText(item.resumo)],
        ]} />
      </article>)}</div>}
    </Collection>
  </div>;
}

function CounterReferrals({ pacienteId, path, referralId }: { pacienteId: string; path: string; referralId: string }) {
  return <Collection<CounterReferralResponse> title="Contrarreferências"
    path={`${path}/encaminhamentos/${encodeURIComponent(referralId)}/contrarreferencias`} pageScope={`contrarreferencia${referralId}`}>
    {rows => <div className="resource-list">{rows.map(item => <article className="resource-item" key={item.contrarreferenciaId}>
      <h3>Contrarreferência de {formatClinicalDate(item.dataRealizada)}</h3>
      <Fields items={[
        ['ID da contrarreferência', <span className="mono">{item.contrarreferenciaId}</span>],
        ['ID do encaminhamento', <span className="mono">{item.encaminhamentoId}</span>],
        ['Atendimento', <AttendanceLink pacienteId={pacienteId} atendimentoId={item.atendimentoId} />],
        ['Status', clinicalLabel(item.status)], ['Resumo', displayText(item.resumo)],
        ['Conduta', displayText(item.conduta)], ['Observações', displayText(item.observacoes)],
      ]} />
    </article>)}</div>}
  </Collection>;
}

function Referral({ item, pacienteId, path }: { item: ReferralResponse; pacienteId: string; path: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const open = searchParams.get('contrarreferencia') === item.encaminhamentoId;
  return <article className="resource-item">
    <h3>Encaminhamento de {formatClinicalDate(item.dataEncaminhamento)}</h3>
    <Fields items={[
      ['ID do encaminhamento', <span className="mono">{item.encaminhamentoId}</span>],
      ['Atendimento', <AttendanceLink pacienteId={pacienteId} atendimentoId={item.atendimentoId} />],
      ['ID do tipo de encaminhamento', displayText(item.tipoEncaminhamentoId)], ['ID do projeto', displayText(item.projetoId)],
      ['Origem', clinicalLabel(item.origem)], ['Destino', displayText(item.destinoNome)],
      ['Serviço de destino', displayText(item.destinoServico)], ['Especialidade de destino', displayText(item.especialidadeDestino)],
      ['Data de agendamento', formatClinicalDate(item.dataAgendamento)], ['Data de realização', formatClinicalDate(item.dataRealizacao)],
      ['Status', clinicalLabel(item.status)], ['Prioridade', clinicalLabel(item.prioridade)],
      ['Documento apresentado', triState(item.documentoApresentado)], ['Motivo', displayText(item.motivo)],
      ['Conduta orientada', displayText(item.condutaOrientada)], ['Observações', displayText(item.observacoes)],
    ]} />
    <details open={open}>
      <summary onClick={event => {
        event.preventDefault();
        const next = new URLSearchParams(searchParams);
        if (open) next.delete('contrarreferencia');
        else next.set('contrarreferencia', item.encaminhamentoId);
        setSearchParams(next);
      }}>Contrarreferências do encaminhamento <span className="mono">{item.encaminhamentoId}</span></summary>
      {open && <CounterReferrals pacienteId={pacienteId} path={path} referralId={item.encaminhamentoId} />}
    </details>
  </article>;
}

export function PatientReferrals({ pacienteId, path }: { pacienteId: string; path: string }) {
  return <Collection<ReferralResponse> title="Encaminhamentos" path={`${path}/encaminhamentos`} pageScope="encaminhamentos">
    {rows => <div className="resource-list">{rows.map(item => <Referral key={item.encaminhamentoId} item={item} pacienteId={pacienteId} path={path} />)}</div>}
  </Collection>;
}

export function PatientPending({ pacienteId, path }: { pacienteId: string; path: string }) {
  return <Collection<PendenciaResponse> title="Pendências do paciente" path={`${path}/pendencias`} pageScope="pendencias">
    {rows => <div className="resource-list">{rows.map(item => <article className="resource-item" key={item.pendenciaId}>
      <h3>{item.descricao}</h3>
      <Fields items={[
        ['ID da pendência', <span className="mono">{item.pendenciaId}</span>],
        ['Atendimento', <AttendanceLink pacienteId={pacienteId} atendimentoId={item.atendimentoId} />],
        ['Status', clinicalLabel(item.status)], ['Identificada em', formatClinicalDate(item.dataIdentificacao)],
        ['Resolvida em', formatClinicalDate(item.dataResolucao)],
      ]} />
    </article>)}</div>}
  </Collection>;
}

export function PatientAnnualFollowup({ pacienteId, path }: { pacienteId: string; path: string }) {
  return <div className="record-grid">
    <Collection<ClinicalEventResponse> title="Ocorrências anuais" path={`${path}/ocorrencias-anuais`} pageScope="ocorrencias">
      {rows => <>
        <p className="muted">O ano informado preserva a precisão anual; não representa uma visita com data completa.</p>
        <div className="resource-list">{rows.map(item => <article className="resource-item" key={item.eventoId}>
          <h3>{clinicalLabel(item.tipo)}</h3>
          <Fields items={[
            ['ID da ocorrência', <span className="mono">{item.eventoId}</span>],
            ['Ano', displayText(item.ano)], ['Precisão', clinicalLabel(item.precisao)],
          ]} />
        </article>)}</div>
      </>}
    </Collection>
    <Collection<AnnualReturnResponse> title="Retornos anuais" path={`${path}/retornos-anuais`} pageScope="retornosAnuais">
      {rows => <div className="resource-list">{rows.map(item => <article className="resource-item" key={item.retornoId}>
        <h3>Retorno de {formatClinicalDate(item.dataRealizada)}</h3>
        <Fields items={[
          ['ID do retorno', <span className="mono">{item.retornoId}</span>],
          ['Atendimento', <AttendanceLink pacienteId={pacienteId} atendimentoId={item.atendimentoId} />],
          ['Resumo', displayText(item.resumo)],
        ]} />
      </article>)}</div>}
    </Collection>
  </div>;
}
