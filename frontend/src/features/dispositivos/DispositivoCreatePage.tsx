import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { PacienteDetalheResponse, DispositivoCriadoResponse, DispositivoResponse } from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import { Card, PageHeading } from '../../shared/ui';
import { DraftQueryState, EditingGate, MutationForm, useClinicalDraft } from '../../shared/writing';
import { SelectField, TextAreaField } from '../clinical/CoreFields';
import { sameResourceReturn } from '../sorologias/sorologia-model';
import { emptyDispositivo, dispositivoBody, dispositivoFields, dispositivoTypes,
  type DispositivoField, type DispositivoValues } from './dispositivo-model';
import { DispositivoDetails, useDispositivoContext } from './DispositivosPage';

interface Draft {
  values: DispositivoValues;
  reviewing: boolean;
  engaged: boolean;
  operationKey: string;
  confirmedId: string | null;
}
interface Receipt { dispositivoId: string; values: DispositivoValues }
const emptyDraft = (): Draft => ({ values: emptyDispositivo(), reviewing: false, engaged: false,
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

function DispositivoForm({ path, back }: { path: string; back: string }) {
  const [draft, setDraft] = useClinicalDraft<Draft>(`dispositivo:${path}`, emptyDraft());
  const [receipts, setReceipts] = useClinicalDraft<Receipt[]>(`dispositivo-recibos:${path}`, []);
  const heading = useRef<HTMLHeadingElement>(null);
  const changedStep = useRef(false);
  useEffect(() => { if (changedStep.current) heading.current?.focus(); }, [draft.reviewing, draft.operationKey]);
  const field = (name: DispositivoField, value: string) => setDraft(previous => ({ ...previous,
    values: { ...previous.values, [name]: value }, engaged: true }));
  const body = { tipoDispositivo: draft.values.tipoDispositivo as DispositivoResponse['tipoDispositivo'], possuiDispositivo: draft.values.possuiDispositivo === '' ? null : draft.values.possuiDispositivo === 'sim', observacoes: draft.values.observacoes || null };
  const latest = new URL(back, 'http://app.local');
  latest.searchParams.set('dispositivosOffset', '0');
  const verificationPath = `${latest.pathname}${latest.search}${latest.hash}`;
  const goTo = (reviewing: boolean) => {
    if (reviewing && heading.current?.closest('form')?.reportValidity() === false) return;
    changedStep.current = true;
    setDraft(previous => ({ ...previous, reviewing, engaged: true }));
  };
  const startNew = () => { changedStep.current = true; setDraft(emptyDraft()); };
  return <>
    <Card>
      <MutationForm<DispositivoCriadoResponse> key={draft.operationKey} title="Registrar dispositivo" path={path} method="POST"
        operationKey={draft.operationKey} responseId="dispositivoId" dirty={draft.engaged && !draft.confirmedId}
        submitVisible={draft.reviewing && !draft.confirmedId} submitLabel="Confirmar dispositivo"
        verificationPath={verificationPath} verificationLabel="Verificar episódios do paciente"
        buildBody={() => {
          if (!draft.reviewing || draft.confirmedId) throw new Error('Revise os três campos antes de confirmar a registro de AVC.');
          return dispositivoBody(draft.values);
        }} onSaved={receipt => {
          setDraft(previous => ({ ...previous, confirmedId: receipt.dispositivoId }));
          setReceipts(previous => previous.some(item => item.dispositivoId === receipt.dispositivoId) ? previous
            : [...previous, { dispositivoId: receipt.dispositivoId, values: { ...draft.values } }]);
        }} intentionReview={abandon => !draft.reviewing && !draft.confirmedId && draft.engaged
          ? <DiscardDraft onDiscard={() => { abandon(); startNew(); }} /> : null}>
        {!draft.confirmedId && <>
          <fieldset className="form-section" hidden={draft.reviewing} disabled={draft.reviewing}>
            <legend>Campos do estado inicial</legend><h2 ref={!draft.reviewing ? heading : undefined} tabIndex={-1}>Dados do dispositivo</h2>
            <p>Selecione o tipo e informe o estado conhecido. Observações são preservadas mesmo com Não ou desconhecido. Um registro existente não será substituído.</p>
            <div className="form-grid">{dispositivoFields.map(([name, label, type]) => type === 'boolean' || type === 'tipo'
              ? <SelectField key={name} label={label} value={draft.values[name]} blank={type === 'tipo' ? 'Selecione o tipo' : 'Desconhecido (sem informação)'}
                required={type === 'tipo'} options={type === 'tipo' ? dispositivoTypes : [[ 'sim', 'Sim' ], [ 'nao', 'Não' ]]}
                onChange={value => field(name, value)} />
              : <TextAreaField key={name} label={label} value={draft.values[name]}
                maxLength={10000} onChange={value => field(name, value)} />)}</div>
            <button type="button" className="button" onClick={() => goTo(true)}>Revisar dispositivo</button>
          </fieldset>
          <section className="form-section" hidden={!draft.reviewing} aria-label="Resumo do dispositivo">
            <h2 ref={draft.reviewing ? heading : undefined} tabIndex={-1}>Revisão do dispositivo</h2>
            <p>Confira os três campos. Estado consolidado por paciente e tipo. Se já existir, o servidor recusará o envio sem substituir o registro; não é procedimento de implante.</p>
            <DispositivoDetails values={body} />
            <button type="button" className="button button-secondary" onClick={() => goTo(false)}>Voltar aos campos</button>
          </section>
        </>}
      </MutationForm>
      {draft.confirmedId && <button type="button" className="button button-secondary" onClick={startNew}>Registrar outro tipo</button>}
    </Card>
    {receipts.length > 0 && <Card><h2>Estados de dispositivo confirmados nesta sessão</h2>{receipts.map(receipt => <article className="resource-item" key={receipt.dispositivoId}>
      <h3>Estado confirmado {receipt.dispositivoId}</h3><DispositivoDetails values={dispositivoBody(receipt.values) as Pick<DispositivoResponse, DispositivoField>} />
    </article>)}<Link to={verificationPath}>Conferir estados do paciente</Link></Card>}
  </>;
}

export default function DispositivoCreatePage() {
  const { pacienteId, patientPath, path } = useDispositivoContext();
  const [params] = useSearchParams();
  const back = sameResourceReturn(path, params.get('retorno'));
  const context = useApiQuery<PacienteDetalheResponse>(patientPath);
  return <>
    <Link to={back} className="back-link">← Voltar aos episódios</Link>
    <PageHeading title="Registrar dispositivo" description={`Paciente ${pacienteId} · longitudinal`} />
    <EditingGate><DraftQueryState query={context}>{() => <DispositivoForm key={path} path={path} back={back} />}</DraftQueryState></EditingGate>
  </>;
}
