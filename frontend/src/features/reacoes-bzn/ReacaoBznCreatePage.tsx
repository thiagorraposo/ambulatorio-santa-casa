import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { TratamentoBznResponse, ReacaoBznCriadaResponse, ReacaoBznOcorrenciaResponse } from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import { Card, EmptyState, PageHeading } from '../../shared/ui';
import { DraftQueryState, EditingGate, MutationForm, useClinicalDraft } from '../../shared/writing';
import { InputField, TextAreaField } from '../clinical/CoreFields';
import { sameResourceReturn } from '../sorologias/sorologia-model';
import { emptyReacao, reacaoBody, reacaoFields,
  type ReacaoField, type ReacaoValues } from './reacao-model';
import { ReacaoDetails, useReacaoContext } from './ReacoesBznPage';

interface Draft {
  values: ReacaoValues;
  reviewing: boolean;
  engaged: boolean;
  operationKey: string;
  confirmedId: string | null;
}
interface Receipt { reacaoId: string; values: ReacaoValues }
const emptyDraft = (): Draft => ({ values: emptyReacao(), reviewing: false, engaged: false,
  operationKey: crypto.randomUUID(), confirmedId: null });

function DiscardDraft({ onDiscard }: { onDiscard: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const start = useRef<HTMLButtonElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  const opened = useRef(false);
  useEffect(() => {
    if (confirming) keep.current?.focus();
    else if (opened.current) start.current?.focus();
  }, [confirming]);
  const cancel = () => { setConfirming(false); };
  return <section className="form-section" aria-label="Descarte do rascunho" onKeyDown={event => {
    if (confirming && event.key === 'Escape') { event.preventDefault(); cancel(); }
  }}>
    <button type="button" className="button button-secondary" ref={start} hidden={confirming}
      onClick={() => { opened.current = true; setConfirming(true); }}>Descartar rascunho</button>
    {confirming && <><p>Isso apaga somente este rascunho não confirmado. Episódios já salvos e seus recibos são preservados.</p>
      <button type="button" className="button button-secondary" ref={keep} onClick={cancel}>Continuar editando</button>
      <button type="button" className="button button-secondary" onClick={onDiscard}>Confirmar descarte do rascunho</button></>}
  </section>;
}

function ReacaoForm({ path, back }: { path: string; back: string }) {
  const [draft, setDraft] = useClinicalDraft<Draft>(`reacao-bzn:${path}`, emptyDraft());
  const [receipts, setReceipts] = useClinicalDraft<Receipt[]>(`reacao-bzn-recibos:${path}`, []);
  const heading = useRef<HTMLHeadingElement>(null);
  const changedStep = useRef(false);
  useEffect(() => { if (changedStep.current) heading.current?.focus(); }, [draft.reviewing, draft.operationKey]);
  const field = (name: ReacaoField, value: string) => setDraft(previous => ({ ...previous,
    values: { ...previous.values, [name]: value }, engaged: true }));
  const body = reacaoBody(draft.values) as Pick<ReacaoBznOcorrenciaResponse, ReacaoField>;
  const latest = new URL(back, 'http://app.local');
  latest.searchParams.set('reacoesOffset', '0');
  const verificationPath = `${latest.pathname}${latest.search}${latest.hash}`;
  const goTo = (reviewing: boolean) => {
    if (reviewing && heading.current?.closest('form')?.reportValidity() === false) return;
    changedStep.current = true;
    setDraft(previous => ({ ...previous, reviewing, engaged: true }));
  };
  const startNew = () => { changedStep.current = true; setDraft(emptyDraft()); };
  return <>
    <Card>
      <MutationForm<ReacaoBznCriadaResponse> key={draft.operationKey} title="Registrar reação BZN" path={path} method="POST"
        operationKey={draft.operationKey} responseId="reacaoId" dirty={draft.engaged && !draft.confirmedId}
        submitVisible={draft.reviewing && !draft.confirmedId} submitLabel="Confirmar reação BZN"
        verificationPath={verificationPath} verificationLabel="Verificar reações do paciente"
        buildBody={() => {
          if (!draft.reviewing || draft.confirmedId) throw new Error('Revise os cinco campos antes de confirmar a reação.');
          return reacaoBody(draft.values);
        }} onSaved={receipt => {
          setDraft(previous => ({ ...previous, confirmedId: receipt.reacaoId }));
          setReceipts(previous => previous.some(item => item.reacaoId === receipt.reacaoId) ? previous
            : [...previous, { reacaoId: receipt.reacaoId, values: { ...draft.values } }]);
        }} intentionReview={abandon => !draft.reviewing && !draft.confirmedId && draft.engaged
          ? <DiscardDraft onDiscard={() => { abandon(); startNew(); }} /> : null}>
        {!draft.confirmedId && <>
          <fieldset className="form-section" hidden={draft.reviewing} disabled={draft.reviewing}>
            <legend>Campos do episódio</legend><h2 ref={!draft.reviewing ? heading : undefined} tabIndex={-1}>Dados da reação BZN</h2>
            <p>Descreva a ocorrência. Gravidade e consequência recebem somente o relato informado, sem escala automática. Não complete dia ou mês desconhecidos.</p>
            <div className="form-grid">{reacaoFields.map(([name,label,type]) => type==='textarea'
              ? <TextAreaField key={name} label={label} value={draft.values[name]} required={name==='descricao'}
                maxLength={name==='gravidade'?1000:10000} onChange={value=>field(name,value)} />
              : <InputField key={name} label={label} value={draft.values[name]} type="date"
                onChange={value=>field(name,value)} />)}</div>
            <button type="button" className="button" onClick={() => goTo(true)}>Revisar reação BZN</button>
          </fieldset>
          <section className="form-section" hidden={!draft.reviewing} aria-label="Resumo da reação BZN">
            <h2 ref={draft.reviewing ? heading : undefined} tabIndex={-1}>Revisão da reação BZN</h2>
            <p>Confira os cinco campos. Confirmar adiciona uma ocorrência ao tratamento existente; não altera seus indicadores nem cria outro tratamento.</p>
            <ReacaoDetails values={body} />
            <button type="button" className="button button-secondary" onClick={() => goTo(false)}>Voltar aos campos</button>
          </section>
        </>}
      </MutationForm>
      {draft.confirmedId && <button type="button" className="button button-secondary" onClick={startNew}>Registrar outra reação</button>}
    </Card>
    {receipts.length > 0 && <Card><h2>Reações BZN confirmadas nesta sessão</h2>{receipts.map(receipt => <article className="resource-item" key={receipt.reacaoId}>
      <h3>Reação confirmada {receipt.reacaoId}</h3><ReacaoDetails values={reacaoBody(receipt.values) as Pick<ReacaoBznOcorrenciaResponse, ReacaoField>} />
    </article>)}<Link to={verificationPath}>Conferir reações do paciente</Link></Card>}
  </>;
}

export default function ReacaoBznCreatePage() {
  const { pacienteId, patientPath, path } = useReacaoContext();
  const [params] = useSearchParams();
  const back = sameResourceReturn(path, params.get('retorno'));
  const context = useApiQuery<TratamentoBznResponse | null>(`${patientPath}/tratamento-bzn`);
  return <>
    <Link to={back} className="back-link">← Voltar às reações</Link>
    <PageHeading title="Registrar reação BZN" description={`Paciente ${pacienteId} · longitudinal`} />
    <EditingGate>{context.isSuccess && context.data===null && <EmptyState>É necessário um tratamento BZN já registrado para acrescentar uma reação.</EmptyState>}<DraftQueryState query={context}>{treatment => treatment ? <ReacaoForm key={path} path={path} back={back} /> : <EmptyState>É necessário um tratamento BZN já registrado para acrescentar uma reação.</EmptyState>}</DraftQueryState></EditingGate>
  </>;
}
