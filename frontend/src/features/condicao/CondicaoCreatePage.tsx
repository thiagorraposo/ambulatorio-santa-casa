import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { AtendimentoDetalheResponse, CondicaoChagasCriadaResponse, CondicaoChagasResponse } from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import { Card, PageHeading } from '../../shared/ui';
import { DraftQueryState, EditingGate, MutationForm, useClinicalDraft } from '../../shared/writing';
import { InputField, SelectField, TextAreaField } from '../clinical/CoreFields';
import { sameResourceReturn } from '../sorologias/sorologia-model';
import { emptyCondicao, condicaoBody, condicaoFields, formaOptions, faseOptions,
  type CondicaoField, type CondicaoValues } from './condicao-model';
import { CondicaoDetails, useCondicaoContext } from './CondicaoPage';

interface Draft {
  values: CondicaoValues;
  reviewing: boolean;
  engaged: boolean;
  operationKey: string;
  confirmedId: string | null;
}
const emptyDraft = (): Draft => ({ values: emptyCondicao(), reviewing: false, engaged: false,
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
    {confirming && <><p>Isso apaga somente este rascunho não confirmado. Registros já salvos são preservados.</p>
      <button type="button" className="button button-secondary" ref={keep} onClick={cancel}>Continuar editando</button>
      <button type="button" className="button button-secondary" onClick={onDiscard}>Confirmar descarte do rascunho</button></>}
  </section>;
}

function CondicaoForm({ path, back }: { path: string; back: string }) {
  const [draft, setDraft] = useClinicalDraft<Draft>(`condicao:${path}`, emptyDraft());
  const heading = useRef<HTMLHeadingElement>(null);
  const changedStep = useRef(false);
  useEffect(() => { if (changedStep.current) heading.current?.focus(); }, [draft.reviewing, draft.operationKey]);
  const field = (name: CondicaoField, value: string) => setDraft(previous => ({ ...previous,
    values: { ...previous.values, [name]: value }, engaged: true }));
  const body = condicaoBody(draft.values) as Pick<CondicaoChagasResponse, CondicaoField>;
  const verificationPath = back;
  const goTo = (reviewing: boolean) => {
    if (reviewing && heading.current?.closest('form')?.reportValidity() === false) return;
    changedStep.current = true;
    setDraft(previous => ({ ...previous, reviewing, engaged: true }));
  };
  const startNew = () => { changedStep.current = true; setDraft(emptyDraft()); };
  return <>
    <Card>
      <MutationForm<CondicaoChagasCriadaResponse> key={draft.operationKey} title="Registrar condição de Chagas" path={path} method="POST"
        operationKey={draft.operationKey} responseId="condicaoChagasId" dirty={draft.engaged && !draft.confirmedId}
        submitVisible={draft.reviewing && !draft.confirmedId} submitLabel="Confirmar condição"
        verificationPath={verificationPath} verificationLabel="Conferir condição deste atendimento"
        buildBody={() => {
          if (!draft.reviewing || draft.confirmedId) throw new Error('Revise os seis campos antes de confirmar a condição.');
          return condicaoBody(draft.values);
        }} onSaved={receipt => {
          setDraft(previous => ({ ...previous, confirmedId: receipt.condicaoChagasId }));
        }} intentionReview={abandon => !draft.reviewing && !draft.confirmedId && draft.engaged
          ? <DiscardDraft onDiscard={() => { abandon(); startNew(); }} /> : null}>
        {!draft.confirmedId && <>
          <fieldset className="form-section" hidden={draft.reviewing} disabled={draft.reviewing}>
            <legend>Campos da condição</legend><h2 ref={!draft.reviewing ? heading : undefined} tabIndex={-1}>Dados da condição de Chagas</h2>
            <p>Preencha somente informações conhecidas. Campos vazios serão registrados como desconhecidos. A descrição é preservada mesmo com sintomas marcados como Não ou desconhecidos.</p>
            <div className="form-grid">{condicaoFields.map(([name, label, type]) => type === 'forma' || type === 'fase' || type === 'boolean'
              ? <SelectField key={name} label={label} value={draft.values[name]} blank="Desconhecido (sem informação)"
                options={type === 'forma' ? formaOptions : type === 'fase' ? faseOptions : [['sim', 'Sim'], ['nao', 'Não']]}
                onChange={value => field(name, value)} />
              : type === 'textarea' ? <TextAreaField key={name} label={label} value={draft.values[name]}
                maxLength={10000} onChange={value => field(name, value)} />
                : <InputField key={name} label={label} value={draft.values[name]} maxLength={80}
                  onChange={value => field(name, value)} />)}</div>
            <button type="button" className="button" onClick={() => goTo(true)}>Revisar condição</button>
          </fieldset>
          <section className="form-section" hidden={!draft.reviewing} aria-label="Resumo da condição">
            <h2 ref={draft.reviewing ? heading : undefined} tabIndex={-1}>Revisão da condição de Chagas</h2>
            <p>Confira os seis campos. Confirmar cria a condição deste atendimento, sem alterar diagnóstico ou descoberta. Só é possível um registro por atendimento.</p>
            <CondicaoDetails values={body} />
            <button type="button" className="button button-secondary" onClick={() => goTo(false)}>Voltar aos campos</button>
          </section>
        </>}
      </MutationForm>
    </Card>
    {draft.confirmedId && <Card><h2>Condição confirmada {draft.confirmedId}</h2>
      <CondicaoDetails values={body} /><Link to={verificationPath}>Conferir condição deste atendimento</Link></Card>}
  </>;
}

export default function CondicaoCreatePage() {
  const { pacienteId, atendimentoId, attendancePath, path } = useCondicaoContext();
  const [params] = useSearchParams();
  const back = sameResourceReturn(path, params.get('retorno'));
  const context = useApiQuery<AtendimentoDetalheResponse>(attendancePath);
  return <>
    <Link to={back} className="back-link">← Voltar à condição</Link>
    <PageHeading title="Registrar condição de Chagas" description={`Paciente ${pacienteId} · atendimento ${atendimentoId}`} />
    <EditingGate><DraftQueryState query={context}>{() => <CondicaoForm key={path} path={path} back={back} />}</DraftQueryState></EditingGate>
  </>;
}
