import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { PacienteDetalheResponse, ObitoCriadoResponse, ObitoResponse } from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import { Card, PageHeading } from '../../shared/ui';
import { DraftQueryState, EditingGate, MutationForm, useClinicalDraft } from '../../shared/writing';
import { InputField, SelectField, TextAreaField } from '../clinical/CoreFields';
import { sameResourceReturn } from '../sorologias/sorologia-model';
import { emptyObito, obitoBody, obitoFields,
  type ObitoField, type ObitoValues } from './obito-model';
import { ObitoDetails, useObitoContext } from './ObitoPage';

interface Draft {
  values: ObitoValues;
  reviewing: boolean;
  engaged: boolean;
  operationKey: string;
  confirmedId: string | null;
}
const emptyDraft = (): Draft => ({ values: emptyObito(), reviewing: false, engaged: false,
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

function ObitoForm({ path, back }: { path: string; back: string }) {
  const [draft, setDraft] = useClinicalDraft<Draft>(`obito:${path}`, emptyDraft());
  const heading = useRef<HTMLHeadingElement>(null);
  const changedStep = useRef(false);
  useEffect(() => { if (changedStep.current) heading.current?.focus(); }, [draft.reviewing, draft.operationKey]);
  const field = (name: ObitoField, value: string) => setDraft(previous => ({ ...previous,
    values: { ...previous.values, [name]: value }, engaged: true }));
  const body = obitoBody(draft.values) as Pick<ObitoResponse, ObitoField>;
  const verificationPath = back;
  const goTo = (reviewing: boolean) => {
    if (reviewing && heading.current?.closest('form')?.reportValidity() === false) return;
    changedStep.current = true;
    setDraft(previous => ({ ...previous, reviewing, engaged: true }));
  };
  const startNew = () => { changedStep.current = true; setDraft(emptyDraft()); };
  return <>
    <Card>
      <MutationForm<ObitoCriadoResponse> key={draft.operationKey} title="Registrar estado de óbito" path={path} method="POST"
        operationKey={draft.operationKey} responseId="obitoId" dirty={draft.engaged && !draft.confirmedId}
        submitVisible={draft.reviewing && !draft.confirmedId} submitLabel="Confirmar estado de óbito"
        verificationPath={verificationPath} verificationLabel="Conferir estado do paciente"
        buildBody={() => {
          if (!draft.reviewing || draft.confirmedId) throw new Error('Revise os quatro campos antes de confirmar o estado de óbito.');
          return obitoBody(draft.values);
        }} onSaved={receipt => {
          setDraft(previous => ({ ...previous, confirmedId: receipt.obitoId }));
        }} intentionReview={abandon => !draft.reviewing && !draft.confirmedId && draft.engaged
          ? <DiscardDraft onDiscard={() => { abandon(); startNew(); }} /> : null}>
        {!draft.confirmedId && <>
          <fieldset className="form-section" hidden={draft.reviewing} disabled={draft.reviewing}>
            <legend>Campos do estado inicial</legend><h2 ref={!draft.reviewing ? heading : undefined} tabIndex={-1}>Dados do estado de óbito</h2>
            <p>Informe somente dados conhecidos. Data recebe somente uma data completa: não preencha dia ou mês desconhecidos. Indicador, causa e observações são independentes; marcar Não não apaga os demais campos.</p>
            <div className="form-grid">{obitoFields.map(([name,label,type]) => type==='boolean'
              ? <SelectField key={name} label={label} value={draft.values[name]} blank="Desconhecido (sem informação)"
                  options={[[ 'sim','Sim' ],[ 'nao','Não' ]]} onChange={value=>field(name,value)} />
              : type==='textarea' ? <TextAreaField key={name} label={label} value={draft.values[name]} maxLength={10000} onChange={value=>field(name,value)} />
              : <InputField key={name} label={label} value={draft.values[name]} type="date" onChange={value=>field(name,value)} />)}</div>
            <button type="button" className="button" onClick={() => goTo(true)}>Revisar estado de óbito</button>
          </fieldset>
          <section className="form-section" hidden={!draft.reviewing} aria-label="Resumo do estado de óbito">
            <h2 ref={draft.reviewing ? heading : undefined} tabIndex={-1}>Revisão do estado de óbito</h2>
            <p>Confira os quatro campos. Confirmar cria somente o estado inicial consolidado do paciente; se já existir, o envio será recusado sem substituí-lo. Data ou causa não inferem o indicador de óbito.</p>
            <ObitoDetails values={body} />
            <button type="button" className="button button-secondary" onClick={() => goTo(false)}>Voltar aos campos</button>
          </section>
        </>}
      </MutationForm>
    </Card>
    {draft.confirmedId && <Card><h2>Estado confirmado {draft.confirmedId}</h2>
      <ObitoDetails values={body} /><Link to={verificationPath}>Conferir estado do paciente</Link></Card>}
  </>;
}

export default function ObitoCreatePage() {
  const { pacienteId,patientPath,path } = useObitoContext();
  const [params] = useSearchParams();
  const back = sameResourceReturn(path, params.get('retorno'));
  const context = useApiQuery<PacienteDetalheResponse>(patientPath);
  return <>
    <Link to={back} className="back-link">← Voltar ao estado de óbito</Link>
    <PageHeading title="Registrar estado de óbito" description={`Paciente ${pacienteId} · longitudinal`} />
    <EditingGate><DraftQueryState query={context}>{() => <ObitoForm key={path} path={path} back={back} />}</DraftQueryState></EditingGate>
  </>;
}
