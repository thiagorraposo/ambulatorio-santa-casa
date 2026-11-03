import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { ExameResponse, ResultadoExameCriadoResponse, ResultadoExameResponse } from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import { Card, PageHeading } from '../../shared/ui';
import { DraftQueryState, EditingGate, MutationForm, useClinicalDraft } from '../../shared/writing';
import { TextAreaField } from '../clinical/CoreFields';
import { sameResourceReturn } from '../sorologias/sorologia-model';
import { emptyResultado, resultadoBody, resultadoFields,
  type ResultadoField, type ResultadoValues } from './resultado-model';
import { ResultadoDetails, useResultadoContext } from './ResultadosExamePage';

interface Draft {
  values: ResultadoValues;
  reviewing: boolean;
  engaged: boolean;
  operationKey: string;
  confirmedId: string | null;
}
interface Receipt { resultadoId: string; values: ResultadoValues }
const emptyDraft = (): Draft => ({ values: emptyResultado(), reviewing: false, engaged: false,
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

function ResultadoForm({ path, back }: { path: string; back: string }) {
  const [draft, setDraft] = useClinicalDraft<Draft>(`resultado-exame:${path}`, emptyDraft());
  const [receipts, setReceipts] = useClinicalDraft<Receipt[]>(`resultado-exame-recibos:${path}`, []);
  const heading = useRef<HTMLHeadingElement>(null);
  const changedStep = useRef(false);
  useEffect(() => { if (changedStep.current) heading.current?.focus(); }, [draft.reviewing, draft.operationKey]);
  const field = (name: ResultadoField, value: string) => setDraft(previous => ({ ...previous,
    values: { ...previous.values, [name]: value }, engaged: true }));
  const body = resultadoBody(draft.values) as Pick<ResultadoExameResponse, ResultadoField>;
  const latest = new URL(back, 'http://app.local');
  latest.searchParams.set('resultadosOffset', '0');
  const verificationPath = `${latest.pathname}${latest.search}${latest.hash}`;
  const goTo = (reviewing: boolean) => {
    if (reviewing && heading.current?.closest('form')?.reportValidity() === false) return;
    changedStep.current = true;
    setDraft(previous => ({ ...previous, reviewing, engaged: true }));
  };
  const startNew = () => { changedStep.current = true; setDraft(emptyDraft()); };
  return <>
    <Card>
      <MutationForm<ResultadoExameCriadoResponse> key={draft.operationKey} title="Registrar parâmetro" path={path} method="POST"
        operationKey={draft.operationKey} responseId="resultadoId" dirty={draft.engaged && !draft.confirmedId}
        submitVisible={draft.reviewing && !draft.confirmedId} submitLabel="Confirmar parâmetro"
        verificationPath={verificationPath} verificationLabel="Verificar parâmetros do exame"
        buildBody={() => {
          if (!draft.reviewing || draft.confirmedId) throw new Error('Revise os seis campos antes de confirmar o parâmetro.');
          return resultadoBody(draft.values);
        }} onSaved={receipt => {
          setDraft(previous => ({ ...previous, confirmedId: receipt.resultadoId }));
          setReceipts(previous => previous.some(item => item.resultadoId === receipt.resultadoId) ? previous
            : [...previous, { resultadoId: receipt.resultadoId, values: { ...draft.values } }]);
        }} intentionReview={abandon => !draft.reviewing && !draft.confirmedId && draft.engaged
          ? <DiscardDraft onDiscard={() => { abandon(); startNew(); }} /> : null}>
        {!draft.confirmedId && <>
          <fieldset className="form-section" hidden={draft.reviewing} disabled={draft.reviewing}>
            <legend>Campos do episódio</legend><h2 ref={!draft.reviewing ? heading : undefined} tabIndex={-1}>Dados do parâmetro</h2>
            <p>Identifique o parâmetro e transcreva somente as informações conhecidas. Não convertemos valores ou unidades nem calculamos a interpretação.</p>
            <div className="form-grid">{resultadoFields.map(([name,label]) =>
              <TextAreaField key={name} label={label} value={draft.values[name]} required={name==='nomeParametro'}
                maxLength={name==='nomeParametro'?120:10000} onChange={value=>field(name,value)} />)}</div>
            <button type="button" className="button" onClick={() => goTo(true)}>Revisar parâmetro</button>
          </fieldset>
          <section className="form-section" hidden={!draft.reviewing} aria-label="Resumo do parâmetro">
            <h2 ref={draft.reviewing ? heading : undefined} tabIndex={-1}>Revisão do parâmetro</h2>
            <p>Confira os seis campos. Confirmar adiciona um parâmetro ao exame identificado; não modifica seu resultado textual, suas datas ou seu estado.</p>
            <ResultadoDetails values={body} />
            <button type="button" className="button button-secondary" onClick={() => goTo(false)}>Voltar aos campos</button>
          </section>
        </>}
      </MutationForm>
      {draft.confirmedId && <button type="button" className="button button-secondary" onClick={startNew}>Registrar outro parâmetro</button>}
    </Card>
    {receipts.length > 0 && <Card><h2>Parâmetros confirmados nesta sessão</h2>{receipts.map(receipt => <article className="resource-item" key={receipt.resultadoId}>
      <h3>Parâmetro confirmado {receipt.resultadoId}</h3><ResultadoDetails values={resultadoBody(receipt.values) as Pick<ResultadoExameResponse, ResultadoField>} />
    </article>)}<Link to={verificationPath}>Conferir parâmetros do exame</Link></Card>}
  </>;
}

export default function ResultadoExameCreatePage() {
  const {pacienteId,exameId,examPath,path} = useResultadoContext();
  const [params] = useSearchParams();
  const back = sameResourceReturn(path, params.get('retorno'));
  const context = useApiQuery<ExameResponse>(examPath);
  return <>
    <Link to={back} className="back-link">← Voltar aos parâmetros</Link>
    <PageHeading title="Registrar parâmetro" description={`Paciente ${pacienteId} · exame ${exameId}`} />
    <EditingGate><DraftQueryState query={context}>{exam => <>
      <Card><h2>{exam.nomeExame} · exame {exam.exameId}</h2>
        <p>Identificação informada: {exam.identificacao ?? 'Não informada'} · bloco {exam.bloco}.</p></Card>
      <ResultadoForm key={path} path={path} back={back} /></>}</DraftQueryState></EditingGate>
  </>;
}
