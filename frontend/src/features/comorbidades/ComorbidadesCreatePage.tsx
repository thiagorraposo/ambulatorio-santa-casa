import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { AtendimentoDetalheResponse, AvaliacaoComorbidadesResponse, ComorbidadeCatalogoResponse } from '../../api/contracts';
import { useApiQuery } from '../../api/useApiQuery';
import { Card, PageHeading, QueryState } from '../../shared/ui';
import { DraftQueryState, EditingGate, MutationForm, useClinicalDraft } from '../../shared/writing';
import { SelectField, TextAreaField, booleanOptions } from '../clinical/CoreFields';
import { sameResourceReturn } from '../sorologias/sorologia-model';
import { ComorbidadesDetails, useComorbidadesContext } from './ComorbidadesPage';
import { comorbidadesBody, emptyValues, type Values, type ItemDraft } from './comorbidades-model';
interface Draft { values: Values; reviewing: boolean; engaged: boolean; operationKey: string; confirmedId: string | null }
const emptyDraft = (): Draft => ({ values: emptyValues(), reviewing: false, engaged: false, operationKey: crypto.randomUUID(), confirmedId: null });
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


function Form({ path, back }: { path: string; back: string }) {
  const [draft, setDraft] = useClinicalDraft<Draft>(`comorbidades:${path}`, emptyDraft());
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null); const changedStep = useRef(false);
  useEffect(() => { if (changedStep.current) heading.current?.focus(); }, [draft.reviewing, draft.operationKey, error]);
  const catalog = useApiQuery<ComorbidadeCatalogoResponse[]>(`/catalogos/comorbidades?limit=20&offset=${offset}`);
  const update = (values: Values) => { setError(''); setDraft(previous => ({ ...previous, values, engaged: true })); };
  const changeItem = (row: ComorbidadeCatalogoResponse, patch: Partial<ItemDraft>) => {
    const current = draft.values.items[row.id] ?? { id: row.id, nome: row.nome, selected: false, presence: '', observacoes: '' };
    update({ ...draft.values, items: { ...draft.values.items, [row.id]: { ...current, ...patch } } });
  };
  const summary: Pick<AvaliacaoComorbidadesResponse, 'itens' | 'historicoFamiliar'> = {
    itens: Object.values(draft.values.items).filter(item => item.selected).map(item => ({ itemId: item.id,
      comorbidadeId: item.id, nomeComorbidade: item.nome, possuiComorbidade: item.presence === '' ? null : item.presence === 'sim', observacoes: item.observacoes || null })),
    historicoFamiliar: draft.values.familiar ? { possuiDoenca: draft.values.familiar === 'desconhecido' ? null : draft.values.familiar === 'sim', descricao: draft.values.descricao || null } : null,
  };
  const review = () => {
    changedStep.current = true;
    try { comorbidadesBody(draft.values); setError(''); setDraft(previous => ({ ...previous, reviewing: true, engaged: true })); }
    catch (e) { setError((e as Error).message); heading.current?.focus(); }
  };
  const reset = () => { changedStep.current = true; setError(''); setDraft(emptyDraft()); };
  return <Card><MutationForm<{ avaliacaoComorbidadesId: string }> key={draft.operationKey} title="Registrar comorbidades"
    path={path} method="POST" operationKey={draft.operationKey} responseId="avaliacaoComorbidadesId"
    dirty={draft.engaged && !draft.confirmedId} submitVisible={draft.reviewing && !draft.confirmedId} submitLabel="Confirmar comorbidades"
    verificationPath={back} verificationLabel="Conferir avaliação deste atendimento"
    buildBody={() => { if (!draft.reviewing || draft.confirmedId) throw new Error('Revise a avaliação antes de confirmar.'); return comorbidadesBody(draft.values); }}
    onSaved={receipt => setDraft(previous => ({ ...previous, confirmedId: receipt.avaliacaoComorbidadesId }))}
    intentionReview={abandon => !draft.reviewing && !draft.confirmedId && draft.engaged ? <DiscardDraft onDiscard={() => { abandon(); reset(); }} /> : null}>
    {!draft.confirmedId && <>
      <fieldset className="form-section" hidden={draft.reviewing} disabled={draft.reviewing}>
        <legend>Avaliação desta consulta</legend><h2 ref={!draft.reviewing ? heading : undefined} tabIndex={-1}>Selecionar comorbidades</h2>
        <p>Selecione somente o que foi avaliado. A seleção inicia como desconhecida; marque Sim ou Não quando informado. Itens não selecionados não serão registrados.</p>
        {error && <p role="alert">{error}</p>}
        <QueryState query={catalog}>{rows => <>{!rows.length && <p>Nenhuma comorbidade nesta página.</p>}{rows.map(row => {
          const item = draft.values.items[row.id];
          return <section key={row.id} className="form-section" aria-label={row.nome}>
            <label style={{ overflowWrap: 'anywhere' }}><input type="checkbox" checked={item?.selected ?? false}
              onChange={e => changeItem(row, { selected: e.target.checked })} /> Avaliar {row.nome}</label>
            {item?.selected && <><SelectField label={`Presença de ${item.nome}`} value={item.presence} blank="Desconhecido (registrado)"
              options={booleanOptions} onChange={value => changeItem(row, { presence: value })} />
              <TextAreaField label={`Observações de ${item.nome}`} value={item.observacoes} onChange={value => changeItem(row, { observacoes: value })} /></>}
          </section>;
        })}</>}</QueryState>
        <p>Catálogo: itens {offset + 1}–{offset + (catalog.isSuccess && !catalog.isFetching ? catalog.data.length : 0)}. Seleções de outras páginas são preservadas.</p>
        <button type="button" className="button button-secondary" disabled={offset === 0 || catalog.isFetching} onClick={() => setOffset(value => Math.max(0, value - 20))}>Página anterior do catálogo</button>
        <button type="button" className="button button-secondary" disabled={!catalog.isSuccess || catalog.isFetching || catalog.data.length < 20 || offset >= 100000} onClick={() => setOffset(value => value + 20)}>Próxima página do catálogo</button>
        <SelectField label="Histórico de doença familiar" value={draft.values.familiar} blank="Não avaliado (não registrar)"
          options={[['desconhecido', 'Desconhecido (registrado)'], ...booleanOptions]}
          onChange={value => update({ ...draft.values, familiar: value })} />
        {draft.values.familiar && <TextAreaField label="Relato familiar" value={draft.values.descricao}
          onChange={value => update({ ...draft.values, descricao: value })} />}
        <p>Relato livre de doenças, incluindo Chagas, separado dos exames de familiares. Nenhum diagnóstico é inferido.</p>
        <button type="button" className="button" onClick={review}>Revisar comorbidades</button>
      </fieldset>
      <section className="form-section" hidden={!draft.reviewing} aria-label="Resumo das comorbidades">
        <h2 ref={draft.reviewing ? heading : undefined} tabIndex={-1}>Revisão das comorbidades</h2>
        <p>Confira todos os itens e o histórico familiar. Uma avaliação por atendimento; outras consultas e o legado permanecem preservados.</p>
        <ComorbidadesDetails values={summary} />
        <button type="button" className="button button-secondary" onClick={() => { changedStep.current = true; setDraft(previous => ({ ...previous, reviewing: false })); }}>Voltar aos campos</button>
      </section>
    </>}
  </MutationForm>
    {draft.confirmedId && <><h2>Avaliação confirmada {draft.confirmedId}</h2><ComorbidadesDetails values={summary} /></>}
  </Card>;
}
export default function ComorbidadesCreatePage() {
  const { pacienteId, atendimentoId, attendancePath, path } = useComorbidadesContext();
  const [params] = useSearchParams(); const back = sameResourceReturn(path, params.get('retorno'));
  const context = useApiQuery<AtendimentoDetalheResponse>(attendancePath);
  return <><Link to={back} className="back-link">← Voltar às comorbidades</Link>
    <PageHeading title="Registrar comorbidades" description={`Paciente ${pacienteId} · atendimento ${atendimentoId}`} />
    <EditingGate><DraftQueryState query={context}>{() => <Form key={path} path={path} back={back} />}</DraftQueryState></EditingGate></>;
}
