import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { AtendimentoDetalheResponse, SorologiaCriadaResponse, SorologiaResponse } from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import { Card, PageHeading } from '../../shared/ui';
import { DraftQueryState, EditingGate, MutationForm, useClinicalDraft } from '../../shared/writing';
import { InputField, SelectField, TextAreaField } from '../clinical/CoreFields';
import { emptySorologia, sameResourceReturn, sorologiaBody, sorologiaFields, sorologiaResults,
  type SorologiaField, type SorologiaValues } from './sorologia-model';
import { SorologiaDetails, useSorologiaContext } from './SorologiasPage';

interface Draft {
  values: SorologiaValues;
  reviewing: boolean;
  engaged: boolean;
  operationKey: string;
  confirmedId: string | null;
}
interface Receipt { sorologiaId: string; values: SorologiaValues }
const emptyDraft = (): Draft => ({ values: emptySorologia(), reviewing: false, engaged: false,
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

function SorologiaForm({ path, back }: { path: string; back: string }) {
  const [draft, setDraft] = useClinicalDraft<Draft>(`sorologia:${path}`, emptyDraft());
  const [receipts, setReceipts] = useClinicalDraft<Receipt[]>(`sorologia-recibos:${path}`, []);
  const heading = useRef<HTMLHeadingElement>(null);
  const changedStep = useRef(false);
  useEffect(() => { if (changedStep.current) heading.current?.focus(); }, [draft.reviewing, draft.operationKey]);
  const field = (name: SorologiaField, value: string) => setDraft(previous => ({ ...previous,
    values: { ...previous.values, [name]: value }, engaged: true }));
  const body = sorologiaBody(draft.values) as Pick<SorologiaResponse, SorologiaField>;
  const latest = new URL(back, 'http://app.local');
  latest.searchParams.set('sorologiasOffset', '0');
  const verificationPath = `${latest.pathname}${latest.search}${latest.hash}`;
  const goTo = (reviewing: boolean) => {
    if (reviewing && heading.current?.closest('form')?.reportValidity() === false) return;
    changedStep.current = true;
    setDraft(previous => ({ ...previous, reviewing, engaged: true }));
  };
  const startNew = () => { changedStep.current = true; setDraft(emptyDraft()); };
  return <>
    <Card>
      <MutationForm<SorologiaCriadaResponse> key={draft.operationKey} title="Registrar sorologia" path={path} method="POST"
        operationKey={draft.operationKey} responseId="sorologiaId" dirty={draft.engaged && !draft.confirmedId}
        submitVisible={draft.reviewing && !draft.confirmedId} submitLabel="Confirmar sorologia"
        verificationPath={verificationPath} verificationLabel="Verificar episódios deste atendimento"
        buildBody={() => {
          if (!draft.reviewing || draft.confirmedId) throw new Error('Revise os sete campos antes de confirmar a sorologia.');
          return sorologiaBody(draft.values);
        }} onSaved={receipt => {
          setDraft(previous => ({ ...previous, confirmedId: receipt.sorologiaId }));
          setReceipts(previous => previous.some(item => item.sorologiaId === receipt.sorologiaId) ? previous
            : [...previous, { sorologiaId: receipt.sorologiaId, values: { ...draft.values } }]);
        }} intentionReview={abandon => !draft.reviewing && !draft.confirmedId && draft.engaged
          ? <DiscardDraft onDiscard={() => { abandon(); startNew(); }} /> : null}>
        {!draft.confirmedId && <>
          <fieldset className="form-section" hidden={draft.reviewing} disabled={draft.reviewing}>
            <legend>Campos do episódio</legend><h2 ref={!draft.reviewing ? heading : undefined} tabIndex={-1}>Dados da sorologia</h2>
            <p>Preencha somente informações conhecidas. Campos vazios permanecerão sem informação; não se calcula uma data a partir de outra.</p>
            <div className="form-grid">{sorologiaFields.map(([name, label, type]) => type === 'result'
              ? <SelectField key={name} label={label} value={draft.values[name]} blank="Desconhecido (sem informação)"
                options={sorologiaResults} onChange={value => field(name, value)} />
              : type === 'textarea' ? <TextAreaField key={name} label={label} value={draft.values[name]}
                maxLength={10000} onChange={value => field(name, value)} />
                : <InputField key={name} label={label} value={draft.values[name]} type={type} maxLength={type === 'text' ? 120 : undefined}
                  onChange={value => field(name, value)} />)}</div>
            <button type="button" className="button" onClick={() => goTo(true)}>Revisar sorologia</button>
          </fieldset>
          <section className="form-section" hidden={!draft.reviewing} aria-label="Resumo da sorologia">
            <h2 ref={draft.reviewing ? heading : undefined} tabIndex={-1}>Revisão da sorologia</h2>
            <p>Confira os sete campos. Confirmar cria somente este episódio; não altera descoberta, diagnóstico ou resultado final do atendimento.</p>
            <SorologiaDetails values={body} />
            <button type="button" className="button button-secondary" onClick={() => goTo(false)}>Voltar aos campos</button>
          </section>
        </>}
      </MutationForm>
      {draft.confirmedId && <button type="button" className="button button-secondary" onClick={startNew}>Registrar outro episódio</button>}
    </Card>
    {receipts.length > 0 && <Card><h2>Sorologias confirmadas nesta sessão</h2>{receipts.map(receipt => <article className="resource-item" key={receipt.sorologiaId}>
      <h3>Sorologia confirmada {receipt.sorologiaId}</h3><SorologiaDetails values={sorologiaBody(receipt.values) as Pick<SorologiaResponse, SorologiaField>} />
    </article>)}<Link to={verificationPath}>Conferir episódios deste atendimento</Link></Card>}
  </>;
}

export default function SorologiaCreatePage() {
  const { pacienteId, atendimentoId, attendancePath, path } = useSorologiaContext();
  const [params] = useSearchParams();
  const back = sameResourceReturn(path, params.get('retorno'));
  const context = useApiQuery<AtendimentoDetalheResponse>(attendancePath);
  return <>
    <Link to={back} className="back-link">← Voltar aos episódios</Link>
    <PageHeading title="Registrar sorologia" description={`Paciente ${pacienteId} · atendimento ${atendimentoId}`} />
    <EditingGate><DraftQueryState query={context}>{() => <SorologiaForm key={path} path={path} back={back} />}</DraftQueryState></EditingGate>
  </>;
}
