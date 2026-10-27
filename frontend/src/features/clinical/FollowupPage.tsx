import { useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import type { AtendimentoDetalheResponse, AtendimentoResumoResponse, NotificationResponse, PacienteDetalheResponse, PendenciaResponse,
  ProjectResponse, ReferralResponse, TratamentoBznResponse } from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import { useSession } from '../../app/session';
import { formatClinicalDate } from '../../shared/formatters';
import { Card, EmptyState, PageHeading, TableScroll } from '../../shared/ui';
import { MutationForm, useClinicalDraft } from '../../shared/writing';
import { FollowupChoice, FollowupRead, useFollowupAll } from './FollowupChoices';
import { FollowupBoolean, FollowupSelect, FollowupText, useFollowupDraft } from './FollowupFields';
import { followupOperationPath, followupOrigin } from './followup-navigation';
import { counterReferralStatuses, followupBody, followupSections, followupTitles, isFollowupKind,
  notificationDraft, pendingDraft, pendingStatuses, priorities, projectDraft, referralOrigins, referralStatuses,
  type CatalogOption, type FollowupDraft, type FollowupKind, type ReactionDraft } from './followup-contracts';

interface FollowupContext {
  pacienteId: string;
  path: string;
  readPath: string;
  attendanceId: string;
  originAttendanceId: string;
  onAttendanceChange: (value: string) => void;
  operationPath: (kind: FollowupKind) => string;
}
interface FieldSpec {
  name: string;
  label: string;
  type?: 'text' | 'date' | 'number' | 'boolean' | 'select';
  options?: readonly (readonly [string, string])[];
  required?: boolean;
  maximum?: number;
  max?: number;
  multiline?: boolean;
  emptyLabel?: string;
}

const bznFields: FieldSpec[] = [
  { name: 'temIndicacao', label: 'Tem indicação de BZN?', type: 'boolean' },
  { name: 'motivoNaoIndicacao', label: 'Motivo de não indicação', multiline: true },
  { name: 'iniciado', label: 'Tratamento iniciado?', type: 'boolean' },
  { name: 'motivoNaoInicio', label: 'Motivo de não início', multiline: true },
  { name: 'tratamentoPeloAmbulatorio', label: 'Tratamento pelo ambulatório?', type: 'boolean' },
  { name: 'duracaoCumpridaDias', label: 'Duração efetivamente cumprida (dias)', type: 'number', max: 2147483647 },
  { name: 'anoUsoAproximado', label: 'Ano aproximado de uso', type: 'number', max: 9999 },
  { name: 'dataPrescricao', label: 'Data da prescrição', type: 'date' },
  { name: 'teveReacaoAdversa', label: 'Teve reação adversa?', type: 'boolean' },
  { name: 'observacoes', label: 'Observações do tratamento', multiline: true },
];
const projectFields: FieldSpec[] = [
  { name: 'participa', label: 'Participa do projeto?', type: 'boolean' },
  { name: 'possuiPendencia', label: 'Possui pendência no projeto?', type: 'boolean' },
  { name: 'descricaoPendencia', label: 'Descrição da pendência no projeto', multiline: true },
  { name: 'houveFalha', label: 'Houve falha no projeto?', type: 'boolean' },
  { name: 'descricaoFalha', label: 'Descrição da falha no projeto', multiline: true },
  { name: 'observacoes', label: 'Observações do projeto', multiline: true },
];
const notificationFields: FieldSpec[] = [
  { name: 'pacienteNotificado', label: 'Paciente notificado?', type: 'boolean' },
  { name: 'numeroNotificacao', label: 'Número da notificação', maximum: 100 },
  { name: 'justificativaNaoNotificacao', label: 'Justificativa de não notificação', multiline: true },
  { name: 'observacoes', label: 'Observações da notificação', multiline: true },
];
const referralFields: FieldSpec[] = [
  { name: 'origem', label: 'Origem do encaminhamento', type: 'select', options: referralOrigins },
  { name: 'destinoNome', label: 'Nome do destino', maximum: 180 },
  { name: 'destinoServico', label: 'Serviço de destino', maximum: 180 },
  { name: 'especialidadeDestino', label: 'Especialidade de destino', maximum: 120 },
  { name: 'dataEncaminhamento', label: 'Data do encaminhamento', type: 'date' },
  { name: 'dataAgendamento', label: 'Data do agendamento', type: 'date' },
  { name: 'dataRealizacao', label: 'Data da realização', type: 'date' },
  { name: 'status', label: 'Status do encaminhamento', type: 'select', options: referralStatuses },
  { name: 'prioridade', label: 'Prioridade', type: 'select', options: priorities },
  { name: 'documentoApresentado', label: 'Documento apresentado?', type: 'boolean' },
  { name: 'motivo', label: 'Motivo do encaminhamento', multiline: true },
  { name: 'condutaOrientada', label: 'Conduta orientada', multiline: true },
  { name: 'observacoes', label: 'Observações do encaminhamento', multiline: true },
];
const counterReferralFields: FieldSpec[] = [
  { name: 'dataRealizada', label: 'Data de realização da contrarreferência', type: 'date' },
  { name: 'status', label: 'Status da contrarreferência', type: 'select', options: counterReferralStatuses },
  { name: 'resumo', label: 'Resumo da contrarreferência', multiline: true },
  { name: 'conduta', label: 'Conduta da contrarreferência', multiline: true },
  { name: 'observacoes', label: 'Observações da contrarreferência', multiline: true },
];
const pendingCreateFields: FieldSpec[] = [
  { name: 'descricao', label: 'Descrição da pendência', required: true, multiline: true },
  { name: 'status', label: 'Status da pendência', type: 'select', options: pendingStatuses, emptyLabel: 'Desconhecido' },
  { name: 'dataIdentificacao', label: 'Data de identificação da pendência', type: 'date' },
  { name: 'dataResolucao', label: 'Data de resolução da pendência', type: 'date' },
];
const pendingUpdateFields: FieldSpec[] = [
  { name: 'status', label: 'Status da pendência', type: 'select', options: pendingStatuses, required: true },
  { name: 'dataResolucao', label: 'Data de resolução da pendência', type: 'date' },
];
const followupResponseIds: Record<FollowupKind, string> = {
  bzn: 'tratamentoId', 'retorno-bzn': 'retornoId', 'retorno-anual': 'retornoId',
  'ocorrencia-anual': 'eventoId', projeto: 'projetoId', notificacao: 'notificacaoId',
  encaminhamento: 'encaminhamentoId', contrarreferencia: 'contrarreferenciaId', pendencia: 'pendenciaId',
};

function FollowupDraftFields({ fields, draft, onChange }: {
  fields: FieldSpec[]; draft: FollowupDraft; onChange: (name: string, value: string) => void;
}) {
  return <div className="form-grid">{fields.map(field => {
    const common = { key: field.name, label: field.label, value: draft[field.name] ?? '',
      onChange: (value: string) => onChange(field.name, value) };
    if (field.type === 'boolean') return <FollowupBoolean {...common} />;
    if (field.type === 'select') return <FollowupSelect {...common} options={field.options ?? []} required={field.required}
      emptyLabel={field.emptyLabel} />;
    return <FollowupText {...common} type={field.type} maximum={field.maximum} required={field.required}
      multiline={field.multiline} min={field.type === 'number' ? 1 : undefined} max={field.max} />;
  })}</div>;
}

function FollowupAttendance({ context, value, onChange, required = true }: {
  context: FollowupContext; value: string; onChange: (value: string) => void; required?: boolean;
}) {
  return <FollowupChoice<AtendimentoResumoResponse> label="Atendimento de registro" path={`${context.path}/atendimentos`}
    value={value} onChange={next => { onChange(next); context.onAttendanceChange(next); }} required={required} idOf={row => row.atendimentoId}
    labelOf={row => `${formatClinicalDate(row.dataAtendimento)} · Atendimento ${row.atendimentoId}`} />;
}

function FollowupCatalog({ catalog, label, value, onChange, required = false }: {
  catalog: 'projetos' | 'tipos-encaminhamento'; label: string; value: string;
  onChange: (value: string) => void; required?: boolean;
}) {
  return <FollowupChoice<CatalogOption> label={label} path={`/catalogos/${catalog}`} value={value}
    onChange={onChange} required={required} idOf={row => row.id}
    labelOf={row => `${row.nome} · ${row.codigo}`} filter={row => row.ativo} />;
}

function FollowupSaved({ result, readPath }: { result: Record<string, unknown> | null; readPath: string }) {
  if (!result) return null;
  const ids = Object.entries(result).filter(([key, value]) => key.endsWith('Id') && typeof value === 'string');
  return <p className="notice">Salvo neste paciente{ids.map(([key, id]) => <span key={key}> · ID <span className="mono">{String(id)}</span></span>)}.
    {' '}<Link to={readPath}>Conferir na ficha</Link>. Os outros módulos têm confirmação própria.</p>;
}

function FollowupResourceForm({ context, kind, resource, fields, initial, attendance = false,
  original = false, projectId, pendingId, children, title }: {
  context: FollowupContext; kind: FollowupKind; resource: string; fields: FieldSpec[]; initial: FollowupDraft;
  attendance?: boolean; original?: boolean; projectId?: string; pendingId?: string;
  children?: (draft: FollowupDraft, setField: (name: string, value: string) => void) => ReactNode;
  title?: string;
}) {
  const resourceKey = `${context.pacienteId}:${kind}:${resource}:${projectId ?? pendingId ?? ''}:${context.originAttendanceId}`;
  const [operationKey, setOperationKey] = useClinicalDraft<string>(`followup-operation:${resourceKey}`, crypto.randomUUID());
  const [receipts, setReceipts] = useClinicalDraft<SavedReceipt[]>(`followup-receipts:${resourceKey}`, []);
  const previous = receipts.filter(receipt => receipt.operationKey !== operationKey);
  return <><FollowupResourceIntention key={operationKey} {...{ context, kind, resource, fields, initial, attendance,
    original, projectId, pendingId, children, title, operationKey, resourceKey }}
    onConfirmed={receipt => setReceipts(prior => [...prior, receipt])}
    onNew={() => setOperationKey(crypto.randomUUID())} />
    {previous.length > 0 && <Card><h2>Registros já confirmados nesta sessão</h2>{previous.map(receipt => <details key={receipt.operationKey}>
      <summary>Registro confirmado {Object.values(receipt.result).filter(value => typeof value === 'string').join(' · ')}</summary>
      <FollowupSaved result={receipt.result} readPath={context.readPath} />
      {receipt.values.atendimentoId && <p>Atendimento <span className="mono">{receipt.values.atendimentoId}</span></p>}
      <dl>{fields.map(field => {
        const value = receipt.values[field.name] ?? '';
        const shown = value === '' ? 'Desconhecido / não registrado' : field.type === 'boolean'
          ? value === 'true' ? 'Sim' : value === 'false' ? 'Não' : value
          : field.type === 'date' ? formatClinicalDate(value) : field.options?.find(([key]) => key === value)?.[1] ?? value;
        return <div key={field.name}><dt>{field.label}</dt><dd>{shown}</dd></div>;
      })}</dl>
    </details>)}</Card>}
  </>;
}

interface SavedReceipt { operationKey: string; result: Record<string, unknown>; values: FollowupDraft }

function FollowupResourceIntention({ context, kind, resource, fields, initial, attendance, original,
  projectId, pendingId, children, title, operationKey, resourceKey, onConfirmed, onNew }: {
  context: FollowupContext; kind: FollowupKind; resource: string; fields: FieldSpec[]; initial: FollowupDraft;
  attendance: boolean; original: boolean; projectId?: string; pendingId?: string; title?: string;
  children?: (draft: FollowupDraft, setField: (name: string, value: string) => void) => ReactNode;
  operationKey: string; resourceKey: string; onConfirmed: (receipt: SavedReceipt) => void; onNew: () => void;
}) {
  const key = `${resourceKey}:${operationKey}`;
  const { model, setField, clearDraft, dirty } = useFollowupDraft(key, initial);
  const [saved, setSaved] = useClinicalDraft<SavedReceipt | null>(`followup-confirmed:${key}`, null);
  const visible = saved?.values ?? model.values;
  const path = `${context.path}/${resource}${pendingId ? `/${encodeURIComponent(pendingId)}` : ''}`;
  const method = pendingId ? 'PATCH' : kind === 'projeto' || kind === 'notificacao' ? 'PUT' : 'POST';
  return <><MutationForm key={key} title={title ?? followupTitles[kind]} path={path} method={method}
    dirty={dirty} submitLabel="Salvar registro" verificationPath={context.readPath} operationKey={operationKey}
    responseId={followupResponseIds[kind]}
    buildBody={() => {
      if (original && !dirty) throw new Error('Nenhuma alteração informada. Revise o registro antes de salvar.');
      return followupBody(kind, model.values, { original: original ? model.original : undefined,
        projectId, updatePending: Boolean(pendingId) });
    }} onSaved={(result: Record<string, unknown>) => {
      const receipt = { operationKey, result, values: { ...model.values } };
      setSaved(receipt); onConfirmed(receipt); clearDraft();
    }}>
    <fieldset className="form-fields" disabled={saved !== null}><legend className="sr-only">{title ?? followupTitles[kind]}</legend>
      {attendance && <FollowupAttendance context={context} value={visible.atendimentoId ?? ''}
        onChange={value => setField('atendimentoId', value)} />}
      {children?.(visible, setField)}
      <FollowupDraftFields fields={fields} draft={visible} onChange={setField} />
    </fieldset>
  </MutationForm><FollowupSaved result={saved?.result ?? null} readPath={context.readPath} />
    {saved && <button type="button" className="button button-secondary" onClick={onNew}>
      {pendingId || kind === 'projeto' || kind === 'notificacao' ? 'Revisar este registro novamente'
        : kind === 'retorno-bzn' || kind === 'retorno-anual' ? 'Registrar outro comparecimento'
          : kind === 'pendencia' ? 'Criar outra pendência' : 'Registrar outro episódio'}</button>}
  </>;
}

function BznComparison({ canonical, draft, onDiscard }: {
  canonical: TratamentoBznResponse; draft: ReturnType<typeof useFollowupDraft>['model']; onDiscard: () => void;
}) {
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
  const contents = JSON.stringify({ ...draft.values, reacoes: draft.reactions.map(row => row.value) }, null, 2);
  function readable(value: unknown): string {
    return value === null || value === undefined || value === '' ? 'Desconhecido / não registrado'
      : value === true || value === 'true' ? 'Sim' : value === false || value === 'false' ? 'Não' : String(value);
  }
  return <section aria-label="Comparação do tratamento BZN e do rascunho">
    <h2>Confira o tratamento registrado e o seu rascunho</h2>
    <p>O tratamento registrado é único. Este rascunho não o substitui e não será enviado novamente.
      Consulte os dados ou copie o rascunho antes de descartá-lo.</p>
    <TableScroll label="Tratamento registrado e rascunho BZN"><table className="data-table"><caption>Tratamento registrado e valores do rascunho BZN</caption>
      <thead><tr><th scope="col">Informação</th><th scope="col">Tratamento registrado</th><th scope="col">Seu rascunho</th></tr></thead>
      <tbody>{[{ name: 'atendimentoId', label: 'Atendimento de registro' }, ...bznFields].map(field => <tr key={field.name}>
        <th scope="row">{field.label}</th><td>{readable(canonical[field.name as keyof TratamentoBznResponse])}</td>
        <td>{readable(draft.values[field.name])}</td></tr>)}</tbody>
    </table></TableScroll>
    <h3>Reações do tratamento registrado</h3>
    {canonical.reacoes.length === 0 ? <p>Nenhuma reação registrada.</p> : canonical.reacoes.map(reaction => <dl key={reaction.reacaoId}>
      <dt>Descrição</dt><dd>{reaction.descricao}</dd><dt>Gravidade</dt><dd>{readable(reaction.gravidade)}</dd>
      <dt>Data</dt><dd>{readable(reaction.dataReacao)}</dd><dt>Consequência</dt><dd>{readable(reaction.consequencia)}</dd>
      <dt>Observações</dt><dd>{readable(reaction.observacoes)}</dd>
    </dl>)}
    <FollowupText label="Rascunho BZN para copiar" value={contents} onChange={() => {}} multiline readOnly />
    <button type="button" className="button button-secondary" onClick={() => {
      if (!navigator.clipboard?.writeText) { setCopyMessage('Selecione e copie o texto no campo Rascunho BZN para copiar.'); return; }
      void navigator.clipboard.writeText(contents).then(() => setCopyMessage('Rascunho copiado.'),
        () => setCopyMessage('Selecione e copie o texto no campo Rascunho BZN para copiar.'));
    }}>Copiar rascunho BZN</button>{copyMessage && <p role="status">{copyMessage}</p>}
    {!confirmDiscard ? <button type="button" className="button button-secondary" onClick={() => setConfirmDiscard(true)}>
      Descartar este rascunho BZN</button> : <div className="notice"><p>Descartar remove somente este rascunho.
      O tratamento registrado e outros rascunhos permanecem.</p><button type="button" className="button" onClick={onDiscard}>
      Confirmar descarte do rascunho BZN</button><button type="button" className="button button-secondary"
        onClick={() => setConfirmDiscard(false)}>Continuar comparando</button></div>}
  </section>;
}

function FollowupBznForm({ context, canonical, refresh }: {
  context: FollowupContext; canonical: TratamentoBznResponse | null; refresh: () => void;
}) {
  const draftKey = `${context.pacienteId}:bzn:novo:${context.originAttendanceId}`;
  const { model, setModel, setField, clearDraft, dirty } = useFollowupDraft(draftKey, {
    ...Object.fromEntries(bznFields.map(field => [field.name, ''])), atendimentoId: context.attendanceId,
  });
  const [saved, setSaved] = useClinicalDraft<{ result: Record<string, unknown>; model: typeof model } | null>(
    `followup-confirmed:${draftKey}`, null);
  const [conflicted, setConflicted] = useClinicalDraft(`followup-bzn-conflict:${draftKey}`, false);
  const visible = saved?.model ?? model;
  function addReaction() {
    const empty: ReactionDraft = { descricao: '', gravidade: '', dataReacao: '', consequencia: '', observacoes: '' };
    setModel(previous => ({ ...previous, reactions: [...previous.reactions, { key: crypto.randomUUID(), value: empty }] }));
  }
  function updateReaction(key: string, name: keyof ReactionDraft, value: string) {
    setModel(previous => ({ ...previous, reactions: previous.reactions.map(reaction =>
      reaction.key === key ? { ...reaction, value: { ...reaction.value, [name]: value } } : reaction) }));
  }
  if (canonical && !dirty && !saved) return null;
  return <><MutationForm title={followupTitles.bzn} path={`${context.path}/tratamento-bzn`} method="POST"
    dirty={dirty} submitLabel="Salvar registro" verificationPath={context.readPath}
    responseId="tratamentoId" operationKey={`bzn:${context.originAttendanceId}`}
    disabled={canonical !== null || conflicted}
    onConflict={() => { setConflicted(true); refresh(); }}
    intentionReview={abandon => canonical && dirty && !saved ? <BznComparison canonical={canonical} draft={model}
      onDiscard={() => { abandon(); clearDraft(); setConflicted(false); }} /> : null}
    conflictReview={() => !canonical ? <p>A consulta ainda não confirmou o tratamento registrado. <button type="button"
      className="button button-secondary" onClick={refresh}>Consultar tratamento novamente</button></p> : null}
    buildBody={() => followupBody('bzn', model.values, { reactions: model.reactions.map(item => item.value) })}
    onSaved={(result: Record<string, unknown>) => { setSaved({ result, model }); clearDraft(); }}>
    <p className="muted">O tratamento BZN é único por paciente. Indicação, início e uso pelo ambulatório são informações independentes.
      Ano aproximado não cria data nem atendimento. As reações são salvas junto com a criação do tratamento.</p>
    <fieldset className="form-fields" disabled={saved !== null || canonical !== null || conflicted}>
      <legend className="sr-only">Tratamento e reações BZN</legend>
      <FollowupAttendance context={context} value={visible.values.atendimentoId ?? ''} required={false}
        onChange={value => setField('atendimentoId', value)} />
      <FollowupDraftFields fields={bznFields} draft={visible.values} onChange={setField} />
      <section aria-label="Reações adversas"><h2>Reações adversas na criação</h2>
        {visible.reactions.map((reaction, index) => <fieldset className="resource-item" key={reaction.key}>
          <legend>Reação {index + 1}</legend><div className="form-grid">
            <FollowupText label={`Descrição da reação ${index + 1}`} value={reaction.value.descricao} required multiline
              onChange={value => updateReaction(reaction.key, 'descricao', value)} />
            <FollowupText label={`Gravidade da reação ${index + 1}`} value={reaction.value.gravidade} maximum={1000}
              onChange={value => updateReaction(reaction.key, 'gravidade', value)} />
            <FollowupText label={`Data da reação ${index + 1}`} value={reaction.value.dataReacao} type="date"
              onChange={value => updateReaction(reaction.key, 'dataReacao', value)} />
            <FollowupText label={`Consequência da reação ${index + 1}`} value={reaction.value.consequencia} multiline
              onChange={value => updateReaction(reaction.key, 'consequencia', value)} />
            <FollowupText label={`Observações da reação ${index + 1}`} value={reaction.value.observacoes} multiline
              onChange={value => updateReaction(reaction.key, 'observacoes', value)} />
          </div><button type="button" className="button button-secondary" onClick={() => {
            setModel(previous => ({ ...previous, reactions: previous.reactions.filter(item => item.key !== reaction.key) }));
          }}>Remover reação {index + 1}</button>
        </fieldset>)}
        <button type="button" className="button button-secondary" disabled={model.reactions.length >= 30}
          onClick={addReaction}>Adicionar reação</button>
      </section>
    </fieldset>
  </MutationForm><FollowupSaved result={saved?.result ?? null} readPath={context.readPath} /></>;
}

function FollowupBzn({ context, returning = false }: { context: FollowupContext; returning?: boolean }) {
  const query = useApiQuery<TratamentoBznResponse | null>(`${context.path}/tratamento-bzn`);
  return <FollowupRead query={query}>{treatment => {
    if (!returning) return <>{treatment && <Card><h2>Tratamento BZN já registrado</h2>
      <p>Este paciente possui o tratamento canônico <span className="mono">{treatment.tratamentoId}</span>.
        A edição de BZN existente e a adição de reações depois da criação ainda não estão disponíveis.</p>
      <Link to={context.readPath}>Consultar tratamento e reações</Link><p>
        <Link to={context.operationPath('retorno-bzn')}>Registrar retorno BZN efetivo</Link></p></Card>}
      <FollowupBznForm context={context} canonical={treatment} refresh={() => { void query.refetch(); }} /></>;
    if (returning && !treatment) return <Card><h2>Tratamento BZN necessário</h2>
      <p>Registre primeiro o tratamento canônico do paciente. Nenhum indicador clínico será inferido.</p>
      <Link to={context.operationPath('bzn')}>Registrar tratamento BZN</Link></Card>;
    return <FollowupResourceForm context={context} kind="retorno-bzn" resource="retornos-bzn" attendance initial={{
      atendimentoId: context.attendanceId, tipo: '', dataRealizada: '', resumo: '',
    }} fields={[
      { name: 'tipo', label: 'Tipo de retorno BZN', type: 'select', required: true,
        options: [['retorno_bzn_30_dias', 'Retorno BZN de 30 dias'], ['retorno_bzn_final', 'Retorno BZN final']] },
      { name: 'dataRealizada', label: 'Data efetiva do comparecimento', type: 'date', required: true },
      { name: 'resumo', label: 'Resumo do retorno', multiline: true },
    ]}>{() => <p className="muted">Tratamento <span className="mono">{treatment!.tratamentoId}</span>.
      Registre cada comparecimento efetivo separadamente; a prescrição não calcula datas de 30 ou 60 dias.</p>}</FollowupResourceForm>;
  }}</FollowupRead>;
}

function FollowupNotification({ context }: { context: FollowupContext }) {
  const query = useApiQuery<NotificationResponse | null>(`${context.path}/notificacao`);
  return <FollowupRead query={query}>{notification => <FollowupResourceForm context={context} kind="notificacao"
    resource="notificacao" fields={notificationFields} initial={notificationDraft(notification)} original={notification !== null}>
    {() => <p className="muted">A notificação pertence ao paciente. O indicador desconhecido é preservado;
      número e justificativa continuam editáveis independentemente do indicador.</p>}
  </FollowupResourceForm>}</FollowupRead>;
}

function FollowupProject({ context, initialProjectId }: { context: FollowupContext; initialProjectId: string }) {
  const [projectId, setProjectId] = useClinicalDraft(`${context.pacienteId}:project-selection:${initialProjectId}`, initialProjectId);
  const current = useFollowupAll<ProjectResponse>(`${context.path}/projetos`);
  return <><Card><h2>Escolher projeto ativo</h2>
    <FollowupCatalog catalog="projetos" label="Projeto" value={projectId} onChange={setProjectId} required />
    <p className="muted">Cada projeto tem salvamento próprio. Rascunhos de outros projetos ficam nesta sessão até serem salvos ou descartados.</p>
  </Card>{projectId && <FollowupRead query={current}>{projects => {
    const existing = projects.find(row => row.projetoId === projectId);
    return <FollowupResourceForm key={projectId} context={context} kind="projeto" resource="projetos"
      projectId={projectId} fields={projectFields} initial={projectDraft(existing)} original={Boolean(existing)}>
      {() => <p className="muted">Projeto <span className="mono">{projectId}</span>{existing ? ` · ${existing.nome}` : ''}.
        Esta participação pertence ao paciente; o atendimento já registrado permanece independente.</p>}
    </FollowupResourceForm>;
  }}</FollowupRead>}</>;
}

function FollowupReferral({ context }: { context: FollowupContext }) {
  const initial = { ...Object.fromEntries(referralFields.map(field => [field.name, ''])),
    atendimentoId: context.attendanceId, tipoEncaminhamentoId: '', projetoId: '' };
  return <FollowupResourceForm context={context} kind="encaminhamento" resource="encaminhamentos" attendance
    initial={initial} fields={referralFields}>{(draft, setField) => <>
    <p className="muted">Este formulário cria um novo encaminhamento. A edição de encaminhamento existente ainda não está disponível.</p>
    <div className="form-grid"><FollowupCatalog catalog="tipos-encaminhamento" label="Tipo de encaminhamento"
      value={draft.tipoEncaminhamentoId} onChange={value => setField('tipoEncaminhamentoId', value)} />
      <FollowupCatalog catalog="projetos" label="Projeto associado ao encaminhamento"
        value={draft.projetoId} onChange={value => setField('projetoId', value)} /></div>
  </>}</FollowupResourceForm>;
}

function FollowupCounterReferral({ context, initialReferralId }: { context: FollowupContext; initialReferralId: string }) {
  const [referralId, setReferralId] = useClinicalDraft(`${context.pacienteId}:referral-selection:${initialReferralId}`, initialReferralId);
  const current = useFollowupAll<ReferralResponse>(`${context.path}/encaminhamentos`);
  return <><Card><h2>Escolher encaminhamento</h2>
    <FollowupChoice<ReferralResponse> label="Encaminhamento de origem" path={`${context.path}/encaminhamentos`}
      value={referralId} onChange={setReferralId} required idOf={row => row.encaminhamentoId}
      onRecord={record => context.onAttendanceChange(record.atendimentoId)}
      labelOf={row => `Encaminhamento ${row.encaminhamentoId} · ${row.destinoServico ?? row.destinoNome ?? 'Destino não informado'} · Atendimento ${row.atendimentoId}`} />
    <p className="muted">Cada contrarreferência é um episódio novo do encaminhamento escolhido.
      O histórico anterior permanece. Upload e representação documental avançada ficam fora deste formulário.</p>
  </Card>{referralId && <FollowupRead query={current}>{referrals => {
    const existing = referrals.find(record => record.encaminhamentoId === referralId);
    if (!existing) return <EmptyState>Encaminhamento indisponível neste paciente. Confira a ficha antes de registrar.</EmptyState>;
    if (context.attendanceId && existing.atendimentoId !== context.attendanceId) return <Card>
      <h2>Confira o atendimento do encaminhamento</h2><p>O encaminhamento escolhido pertence ao atendimento
        {' '}<span className="mono">{existing.atendimentoId}</span>. Confirme essa troca antes de registrar a contrarreferência.</p>
      <button type="button" className="button button-secondary" onClick={() => context.onAttendanceChange(existing.atendimentoId)}>
        Usar atendimento do encaminhamento</button></Card>;
    return <FollowupResourceForm key={referralId} context={{ ...context,
      readPath: `${context.readPath}&contrarreferencia=${encodeURIComponent(referralId)}` }} kind="contrarreferencia"
      resource={`encaminhamentos/${encodeURIComponent(referralId)}/contrarreferencias`} fields={counterReferralFields}
      initial={Object.fromEntries(counterReferralFields.map(field => [field.name, '']))}
      title={`Registrar contrarreferência · encaminhamento ${referralId}`} />;
  }}</FollowupRead>}</>;
}

function FollowupPending({ context, initialPendingId }: { context: FollowupContext; initialPendingId: string }) {
  const [pendingId, setPendingId] = useClinicalDraft(`${context.pacienteId}:pending-selection:${initialPendingId}`, initialPendingId);
  const current = useFollowupAll<PendenciaResponse>(`${context.path}/pendencias`);
  return <><Card><h2>Escolher pendência</h2><FollowupChoice<PendenciaResponse> label="Pendência existente"
    path={`${context.path}/pendencias`} value={pendingId} onChange={setPendingId}
    emptyLabel="Criar nova pendência" idOf={row => row.pendenciaId} labelOf={row => `${row.descricao} · ID ${row.pendenciaId}`} />
    <p className="muted">A atualização altera somente status e data de resolução. Observação e responsável de revisão ainda não estão disponíveis.</p>
  </Card>{pendingId ? <FollowupRead query={current}>{pending => {
    const existing = pending.find(row => row.pendenciaId === pendingId);
    if (!existing) return <EmptyState>Pendência indisponível neste paciente. Confira a ficha antes de registrar.</EmptyState>;
    return <FollowupResourceForm key={pendingId} context={context} kind="pendencia" resource="pendencias"
      pendingId={pendingId} original initial={pendingDraft(existing)} fields={pendingUpdateFields}>
      {() => <><p>{existing.descricao}</p><p className="muted">Para resolver, informe a data de resolução.
        Ao reabrir ou cancelar uma pendência, remova explicitamente essa data.
        Esta atualização ainda exige status conhecido; retornar a desconhecido depende de evolução do contrato.</p></>}
    </FollowupResourceForm>;
  }}</FollowupRead> : <FollowupResourceForm key="nova-pendencia" context={context} kind="pendencia" resource="pendencias"
    fields={pendingCreateFields} attendance initial={{ atendimentoId: context.attendanceId, descricao: '', status: '',
      dataIdentificacao: '', dataResolucao: '' }}>
    {() => <p className="muted">A pendência pertence ao atendimento escolhido. Desconhecido, não informado e aberta são estados distintos.
      Status resolvida exige a data efetiva de resolução.
      A data não é preenchida automaticamente.</p>}
  </FollowupResourceForm>}</>;
}

function FollowupSelected({ context, kind, search }: { context: FollowupContext; kind: FollowupKind; search: URLSearchParams }) {
  switch (kind) {
    case 'bzn': return <FollowupBzn context={context} />;
    case 'retorno-bzn': return <FollowupBzn context={context} returning />;
    case 'notificacao': return <FollowupNotification context={context} />;
    case 'projeto': return <FollowupProject context={context} initialProjectId={search.get('projetoId') ?? ''} />;
    case 'encaminhamento': return <FollowupReferral context={context} />;
    case 'contrarreferencia': return <FollowupCounterReferral context={context} initialReferralId={search.get('encaminhamentoId') ?? ''} />;
    case 'pendencia': return <FollowupPending context={context} initialPendingId={search.get('pendenciaId') ?? ''} />;
    case 'retorno-anual': return <FollowupResourceForm context={context} kind={kind} resource="retornos-anuais" attendance
      initial={{ atendimentoId: context.attendanceId, dataRealizada: '', resumo: '' }} fields={[
        { name: 'dataRealizada', label: 'Data efetiva do comparecimento', type: 'date', required: true },
        { name: 'resumo', label: 'Resumo do retorno anual', multiline: true },
      ]}>{() => <p className="muted">Este registro representa um retorno realizado, com data completa e atendimento.
        Os retornos anteriores permanecem no histórico.</p>}</FollowupResourceForm>;
    case 'ocorrencia-anual': return <FollowupResourceForm context={context} kind={kind} resource="ocorrencias-anuais"
      initial={{ ano: '' }} fields={[{ name: 'ano', label: 'Ano de comparecimento informado', type: 'number', required: true,
        max: new Date().getFullYear() }]}>{() => <p className="muted">Registre somente o ano informado pelo paciente.
          Esta informação preserva a precisão anual e não cria atendimento, retorno, previsão ou dia e mês.</p>}</FollowupResourceForm>;
  }
}

function FollowupAttendanceContext({ context, children }: { context: FollowupContext; children: ReactNode }) {
  const id = context.attendanceId;
  const valid = /^[1-9]\d{0,18}$/.test(id);
  const query = useApiQuery<AtendimentoDetalheResponse>(`${context.path}/atendimentos/${encodeURIComponent(id)}?limit=1&offset=0`, valid);
  if (!valid) return <Card><h2>Atendimento inválido</h2><p>Confira o atendimento na ficha antes de registrar acompanhamento.</p>
    <Link to={context.readPath}>Consultar ficha</Link></Card>;
  return <FollowupRead query={query}>{record => record.atendimentoId !== id
    ? <Card><h2>Atendimento não confirmado</h2><p>A consulta não confirmou este atendimento para o paciente. Confira a ficha.</p>
      <Link to={context.readPath}>Consultar ficha</Link></Card>
    : <><p className="notice">Atendimento de registro <span className="mono">{id}</span> · {formatClinicalDate(record.dataAtendimento)}.
      A troca de atendimento é feita explicitamente no formulário.</p>{children}</>}
  </FollowupRead>;
}

function FollowupPatient({ pacienteId, kind, search }: { pacienteId: string; kind: FollowupKind; search: URLSearchParams }) {
  const session = useSession();
  const path = `/pacientes/${encodeURIComponent(pacienteId)}`;
  const patient = useApiQuery<PacienteDetalheResponse>(`${path}?limit=1&offset=0`);
  const sourceAttendanceId = search.has('origemAtendimentoId') ? search.get('origemAtendimentoId') ?? ''
    : search.get('atendimentoId') ?? '';
  const [attendanceChoices, setAttendanceChoices] = useClinicalDraft<Record<string, string>>(`followup-context:${pacienteId}`, {});
  const attendanceId = attendanceChoices[sourceAttendanceId] ?? search.get('atendimentoId') ?? '';
  const operationSearch = new URLSearchParams(search);
  operationSearch.set('origemAtendimentoId', sourceAttendanceId);
  const context = { pacienteId, path, readPath: `${path}?aba=${followupSections[kind]}`,
    attendanceId, originAttendanceId: sourceAttendanceId,
    onAttendanceChange: (value: string) => setAttendanceChoices(previous => ({ ...previous, [sourceAttendanceId]: value })),
    operationPath: (operation: FollowupKind) => followupOperationPath(path, operation, attendanceId, operationSearch) };
  const origin = followupOrigin(path, search.get('retorno'));
  const selected = <FollowupSelected key={`${pacienteId}:${kind}:${sourceAttendanceId}:${search.get('projetoId') ?? ''}:${search.get('encaminhamentoId') ?? ''}:${search.get('pendenciaId') ?? ''}`}
    context={context} kind={kind} search={search} />;
  return <><nav className="breadcrumb" aria-label="Caminho"><Link to="/pacientes">Pacientes</Link>
    <Link to={context.readPath}>Ficha do paciente</Link>{origin && <Link to={origin}>Voltar à origem</Link>}<span>{followupTitles[kind]}</span></nav>
    <PageHeading title={followupTitles[kind]} description="Cada operação tem confirmação própria. O atendimento previamente salvo permanece no histórico." />
    <nav className="record-nav" aria-label="Operações clínicas">{(Object.keys(followupTitles) as FollowupKind[]).map(operation => {
      return <Link key={operation} aria-current={operation === kind ? 'page' : undefined}
        to={context.operationPath(operation)}>{followupTitles[operation]}</Link>;
    })}</nav>
    <FollowupRead query={patient}>{record => <>
      <Card className="patient-summary"><h2>{record.nome}</h2><p>ID <span className="mono">{record.pacienteId}</span></p></Card>
      {session.user?.perfil === 'consulta' ? <Card><p>Seu perfil permite consultar registros.
        A autorização de escrita depende do perfil e do vínculo verificados pelo servidor.</p><Link to={context.readPath}>Consultar ficha</Link></Card>
        : attendanceId ? <FollowupAttendanceContext context={context}>{selected}</FollowupAttendanceContext> : selected}
    </>}</FollowupRead>
  </>;
}

export default function FollowupPage() {
  const { pacienteId = '' } = useParams();
  const [search] = useSearchParams();
  const kind = search.get('tipo');
  if (!isFollowupKind(kind)) return <><PageHeading title="Registrar acompanhamento" />
    <Card><p>Escolha uma operação disponível a partir da ficha do paciente.</p>
      <Link to={`/pacientes/${encodeURIComponent(pacienteId)}`}>Voltar à ficha</Link></Card></>;
  return <FollowupPatient key={pacienteId} pacienteId={pacienteId} kind={kind} search={search} />;
}
