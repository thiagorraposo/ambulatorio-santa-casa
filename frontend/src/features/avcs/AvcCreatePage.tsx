import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { PacienteDetalheResponse, AvcCriadoResponse, AvcResponse } from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import { Card, PageHeading } from '../../shared/ui';
import { DraftQueryState, EditingGate, MutationForm, useClinicalDraft } from '../../shared/writing';
import { InputField, SelectField, TextAreaField } from '../clinical/CoreFields';
import { sameResourceReturn } from '../sorologias/sorologia-model';
import { emptyAvc, avcBody, avcFields,
  type AvcField, type AvcValues } from './avc-model';
import { AvcDetails, useAvcContext } from './AvcsPage';

interface Draft {
  values: AvcValues;
  reviewing: boolean;
  engaged: boolean;
  operationKey: string;
  confirmedId: string | null;
}
interface Receipt { eventoId: string; values: AvcValues }
const emptyDraft = (): Draft => ({ values: emptyAvc(), reviewing: false, engaged: false,
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

function AvcForm({ path, back }: { path: string; back: string }) {
  const [draft, setDraft] = useClinicalDraft<Draft>(`avc:${path}`, emptyDraft());
  const [receipts, setReceipts] = useClinicalDraft<Receipt[]>(`avc-recibos:${path}`, []);
  const heading = useRef<HTMLHeadingElement>(null);
  const changedStep = useRef(false);
  useEffect(() => { if (changedStep.current) heading.current?.focus(); }, [draft.reviewing, draft.operationKey]);
  const field = (name: AvcField, value: string) => setDraft(previous => ({ ...previous,
    values: { ...previous.values, [name]: value }, engaged: true }));
  const body = avcBody(draft.values) as Pick<AvcResponse, AvcField>;
  const latest = new URL(back, 'http://app.local');
  latest.searchParams.set('avcsOffset', '0');
  const verificationPath = `${latest.pathname}${latest.search}${latest.hash}`;
  const goTo = (reviewing: boolean) => {
    if (reviewing && heading.current?.closest('form')?.reportValidity() === false) return;
    changedStep.current = true;
    setDraft(previous => ({ ...previous, reviewing, engaged: true }));
  };
  const startNew = () => { changedStep.current = true; setDraft(emptyDraft()); };
  return <>
    <Card>
      <MutationForm<AvcCriadoResponse> key={draft.operationKey} title="Registrar AVC" path={path} method="POST"
        operationKey={draft.operationKey} responseId="eventoId" dirty={draft.engaged && !draft.confirmedId}
        submitVisible={draft.reviewing && !draft.confirmedId} submitLabel="Confirmar AVC"
        verificationPath={verificationPath} verificationLabel="Verificar episódios do paciente"
        buildBody={() => {
          if (!draft.reviewing || draft.confirmedId) throw new Error('Revise os quatro campos antes de confirmar a registro de AVC.');
          return avcBody(draft.values);
        }} onSaved={receipt => {
          setDraft(previous => ({ ...previous, confirmedId: receipt.eventoId }));
          setReceipts(previous => previous.some(item => item.eventoId === receipt.eventoId) ? previous
            : [...previous, { eventoId: receipt.eventoId, values: { ...draft.values } }]);
        }} intentionReview={abandon => !draft.reviewing && !draft.confirmedId && draft.engaged
          ? <DiscardDraft onDiscard={() => { abandon(); startNew(); }} /> : null}>
        {!draft.confirmedId && <>
          <fieldset className="form-section" hidden={draft.reviewing} disabled={draft.reviewing}>
            <legend>Campos do episódio</legend><h2 ref={!draft.reviewing ? heading : undefined} tabIndex={-1}>Dados do registro de AVC</h2>
            <p>Preencha somente informações conhecidas. Campos vazios permanecerão desconhecidos; a descrição é preservada ao mudar a presença para Não ou desconhecido.</p>
            <div className="form-grid">{avcFields.map(([name, label, type]) => type === 'boolean'
              ? <SelectField key={name} label={label} value={draft.values[name]} blank="Desconhecido (sem informação)"
                options={[[ 'sim', 'Sim' ], [ 'nao', 'Não' ]]}
                onChange={value => field(name, value)} />
              : type === 'textarea' ? <TextAreaField key={name} label={label} value={draft.values[name]}
                maxLength={10000} onChange={value => field(name, value)} />
                : <InputField key={name} label={label} value={draft.values[name]} type="number" min={0} max={9999} step={1}
                  onChange={value => field(name, value)} />)}</div>
            <button type="button" className="button" onClick={() => goTo(true)}>Revisar AVC</button>
          </fieldset>
          <section className="form-section" hidden={!draft.reviewing} aria-label="Resumo do registro de AVC">
            <h2 ref={draft.reviewing ? heading : undefined} tabIndex={-1}>Revisão do registro de AVC</h2>
            <p>Confira os quatro campos. Registro longitudinal do paciente, sem atendimento associado. Ano e descrição não inferem ocorrência ou diagnóstico.</p>
            <AvcDetails values={body} />
            <button type="button" className="button button-secondary" onClick={() => goTo(false)}>Voltar aos campos</button>
          </section>
        </>}
      </MutationForm>
      {draft.confirmedId && <button type="button" className="button button-secondary" onClick={startNew}>Registrar outro episódio</button>}
    </Card>
    {receipts.length > 0 && <Card><h2>Registros de AVC confirmadas nesta sessão</h2>{receipts.map(receipt => <article className="resource-item" key={receipt.eventoId}>
      <h3>Registro confirmado {receipt.eventoId}</h3><AvcDetails values={avcBody(receipt.values) as Pick<AvcResponse, AvcField>} />
    </article>)}<Link to={verificationPath}>Conferir episódios do paciente</Link></Card>}
  </>;
}

export default function AvcCreatePage() {
  const { pacienteId, patientPath, path } = useAvcContext();
  const [params] = useSearchParams();
  const back = sameResourceReturn(path, params.get('retorno'));
  const context = useApiQuery<PacienteDetalheResponse>(patientPath);
  return <>
    <Link to={back} className="back-link">← Voltar aos episódios</Link>
    <PageHeading title="Registrar AVC" description={`Paciente ${pacienteId} · longitudinal`} />
    <EditingGate><DraftQueryState query={context}>{() => <AvcForm key={path} path={path} back={back} />}</DraftQueryState></EditingGate>
  </>;
}
