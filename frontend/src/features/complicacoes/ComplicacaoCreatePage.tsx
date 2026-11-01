import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { AtendimentoDetalheResponse, ComplicacaoCriadaResponse, ComplicacaoResponse } from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import { Card, PageHeading } from '../../shared/ui';
import { DraftQueryState, EditingGate, MutationForm, useClinicalDraft } from '../../shared/writing';
import { InputField, SelectField, TextAreaField } from '../clinical/CoreFields';
import { sameResourceReturn } from '../sorologias/sorologia-model';
import { emptyComplicacao, complicacaoBody, complicacaoFields, complicacaoSeverities,
  type ComplicacaoField, type ComplicacaoValues } from './complicacao-model';
import { ComplicacaoDetails, useComplicacaoContext } from './ComplicacoesPage';

interface Draft {
  values: ComplicacaoValues;
  reviewing: boolean;
  engaged: boolean;
  operationKey: string;
  confirmedId: string | null;
}
interface Receipt { complicacaoChagasId: string; values: ComplicacaoValues }
const emptyDraft = (): Draft => ({ values: emptyComplicacao(), reviewing: false, engaged: false,
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

function ComplicacaoForm({ path, back }: { path: string; back: string }) {
  const [draft, setDraft] = useClinicalDraft<Draft>(`complicacao:${path}`, emptyDraft());
  const [receipts, setReceipts] = useClinicalDraft<Receipt[]>(`complicacao-recibos:${path}`, []);
  const heading = useRef<HTMLHeadingElement>(null);
  const changedStep = useRef(false);
  useEffect(() => { if (changedStep.current) heading.current?.focus(); }, [draft.reviewing, draft.operationKey]);
  const field = (name: ComplicacaoField, value: string) => setDraft(previous => ({ ...previous,
    values: { ...previous.values, [name]: value }, engaged: true }));
  const body = complicacaoBody(draft.values) as Pick<ComplicacaoResponse, ComplicacaoField>;
  const latest = new URL(back, 'http://app.local');
  latest.searchParams.set('complicacoesOffset', '0');
  const verificationPath = `${latest.pathname}${latest.search}${latest.hash}`;
  const goTo = (reviewing: boolean) => {
    if (reviewing && heading.current?.closest('form')?.reportValidity() === false) return;
    changedStep.current = true;
    setDraft(previous => ({ ...previous, reviewing, engaged: true }));
  };
  const startNew = () => { changedStep.current = true; setDraft(emptyDraft()); };
  return <>
    <Card>
      <MutationForm<ComplicacaoCriadaResponse> key={draft.operationKey} title="Registrar complicação" path={path} method="POST"
        operationKey={draft.operationKey} responseId="complicacaoChagasId" dirty={draft.engaged && !draft.confirmedId}
        submitVisible={draft.reviewing && !draft.confirmedId} submitLabel="Confirmar complicação"
        verificationPath={verificationPath} verificationLabel="Verificar episódios deste atendimento"
        buildBody={() => {
          if (!draft.reviewing || draft.confirmedId) throw new Error('Revise os quatro campos antes de confirmar a complicação.');
          return complicacaoBody(draft.values);
        }} onSaved={receipt => {
          setDraft(previous => ({ ...previous, confirmedId: receipt.complicacaoChagasId }));
          setReceipts(previous => previous.some(item => item.complicacaoChagasId === receipt.complicacaoChagasId) ? previous
            : [...previous, { complicacaoChagasId: receipt.complicacaoChagasId, values: { ...draft.values } }]);
        }} intentionReview={abandon => !draft.reviewing && !draft.confirmedId && draft.engaged
          ? <DiscardDraft onDiscard={() => { abandon(); startNew(); }} /> : null}>
        {!draft.confirmedId && <>
          <fieldset className="form-section" hidden={draft.reviewing} disabled={draft.reviewing}>
            <legend>Campos do episódio</legend><h2 ref={!draft.reviewing ? heading : undefined} tabIndex={-1}>Dados da complicação</h2>
            <p>Preencha somente informações conhecidas. Campos vazios permanecerão desconhecidos; a descrição é preservada ao mudar a presença para Não ou desconhecido.</p>
            <div className="form-grid">{complicacaoFields.map(([name, label, type]) => type === 'severity' || type === 'boolean'
              ? <SelectField key={name} label={label} value={draft.values[name]} blank="Desconhecido (sem informação)"
                options={type === 'severity' ? complicacaoSeverities : [['sim', 'Sim'], ['nao', 'Não']]}
                onChange={value => field(name, value)} />
              : type === 'textarea' ? <TextAreaField key={name} label={label} value={draft.values[name]}
                maxLength={10000} onChange={value => field(name, value)} />
                : <InputField key={name} label={label} value={draft.values[name]} maxLength={80}
                  onChange={value => field(name, value)} />)}</div>
            <button type="button" className="button" onClick={() => goTo(true)}>Revisar complicação</button>
          </fieldset>
          <section className="form-section" hidden={!draft.reviewing} aria-label="Resumo da complicação">
            <h2 ref={draft.reviewing ? heading : undefined} tabIndex={-1}>Revisão da complicação</h2>
            <p>Confira os quatro campos. Confirmar cria somente esta ocorrência, sem inferir condição, diagnóstico ou presença a partir da descrição.</p>
            <ComplicacaoDetails values={body} />
            <button type="button" className="button button-secondary" onClick={() => goTo(false)}>Voltar aos campos</button>
          </section>
        </>}
      </MutationForm>
      {draft.confirmedId && <button type="button" className="button button-secondary" onClick={startNew}>Registrar outro episódio</button>}
    </Card>
    {receipts.length > 0 && <Card><h2>Complicações confirmadas nesta sessão</h2>{receipts.map(receipt => <article className="resource-item" key={receipt.complicacaoChagasId}>
      <h3>Complicação confirmada {receipt.complicacaoChagasId}</h3><ComplicacaoDetails values={complicacaoBody(receipt.values) as Pick<ComplicacaoResponse, ComplicacaoField>} />
    </article>)}<Link to={verificationPath}>Conferir episódios deste atendimento</Link></Card>}
  </>;
}

export default function ComplicacaoCreatePage() {
  const { pacienteId, atendimentoId, attendancePath, path } = useComplicacaoContext();
  const [params] = useSearchParams();
  const back = sameResourceReturn(path, params.get('retorno'));
  const context = useApiQuery<AtendimentoDetalheResponse>(attendancePath);
  return <>
    <Link to={back} className="back-link">← Voltar aos episódios</Link>
    <PageHeading title="Registrar complicação" description={`Paciente ${pacienteId} · atendimento ${atendimentoId}`} />
    <EditingGate><DraftQueryState query={context}>{() => <ComplicacaoForm key={path} path={path} back={back} />}</DraftQueryState></EditingGate>
  </>;
}
