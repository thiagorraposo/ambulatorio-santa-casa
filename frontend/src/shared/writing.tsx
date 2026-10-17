import { createContext, useCallback, useContext, useEffect, useRef, useState,
  useSyncExternalStore, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from 'react';
import { createPortal } from 'react-dom';
import { Link, useBeforeUnload, useBlocker } from 'react-router';
import { useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { aborted, ApiError, isAbort } from '../api/client';
import { useSession } from '../app/session';
import { ApiErrorState, Card } from './ui';
import { clinicalHash, registerIntention, verifyIntention, type ClinicalIntention } from './operation';

class DraftStore {
  readonly values = new Map<string, unknown>();
  readonly unsaved = new Set<string>();
  private listeners = new Map<string, Set<() => void>>();
  subscribe(key: string, callback: () => void): () => void {
    const listeners = this.listeners.get(key) ?? new Set<() => void>();
    this.listeners.set(key, listeners); listeners.add(callback);
    return () => { listeners.delete(callback); if (!listeners.size) this.listeners.delete(key); };
  }
  update(key: string, value: unknown): void {
    this.values.set(key, value); this.listeners.get(key)?.forEach(callback => callback());
  }
  clear(key: string): void {
    this.values.delete(key); this.listeners.get(key)?.forEach(callback => callback());
  }
}
const Drafts = createContext<DraftStore | null>(null);

/** Mounted with an identity/session key: a temporary read failure preserves the draft. */
export function DraftProvider({ children }: { children: ReactNode }) {
  const [drafts] = useState(() => new DraftStore());
  useBeforeUnload(useCallback(event => {
    if (drafts.unsaved.size > 0) { event.preventDefault(); event.returnValue = ''; }
  }, [drafts]));
  return <Drafts.Provider value={drafts}>{children}</Drafts.Provider>;
}

export function useClinicalDraft<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>, () => void] {
  const drafts = useContext(Drafts);
  if (!drafts) throw new Error('DraftProvider obrigatório');
  const initialValue = useRef(initial);
  const initialized = useRef(false);
  if (!initialized.current) {
    if (!drafts.values.has(key)) drafts.values.set(key, initialValue.current);
    initialized.current = true;
  }
  const value = useSyncExternalStore(useCallback(callback => drafts.subscribe(key, callback), [drafts, key]),
    () => drafts.values.has(key) ? drafts.values.get(key) as T : initialValue.current);
  const update = useCallback<Dispatch<SetStateAction<T>>>((next) => {
    const previous = drafts.values.has(key) ? drafts.values.get(key) as T : initialValue.current;
    const result = typeof next === 'function' ? (next as (value: T) => T)(previous) : next;
    drafts.update(key, result);
  }, [drafts, key]);
  const clear = useCallback(() => {
    drafts.clear(key);
  }, [drafts, key]);
  return [value, update, clear];
}

/** Keep the blocker and draft mounted while refreshing, without displaying an old authorized result. */
export function DraftQueryState<T>({ query, children }: { query: UseQueryResult<T, ApiError>; children: (value: T) => ReactNode }) {
  const unavailable = query.isFetching || query.isError;
  return <>
    {(query.isFetching || query.isPending) && <p className="loading-state" role="status">Carregando…</p>}
    {query.isError && <ApiErrorState error={query.error} retry={() => { void query.refetch(); }} />}
    {query.data != null && <fieldset className="form-body" disabled={unavailable} hidden={unavailable}>
      <legend className="sr-only">Registro em edição</legend>{children(query.data)}
    </fieldset>}
  </>;
}

type WriteState = { status: 'idle' | 'pending' | 'saved' | 'error' | 'uncertain' | 'conflict' | 'denied' | 'not_applied';
  message?: string; intention?: ClinicalIntention };
export interface MutationFormProps<T = Record<string, unknown>> {
  title: string;
  path: string;
  method: 'POST' | 'PATCH' | 'PUT';
  buildBody: () => unknown;
  onSaved?: (data: T) => void;
  children: ReactNode;
  dirty: boolean;
  submitLabel?: string;
  verificationPath?: string;
  verificationLabel?: string;
  disabled?: boolean;
  operationKey?: string;
  responseId?: string;
  expectedId?: string;
  conflictReview?: (abandonIntention: () => void) => ReactNode;
  intentionReview?: (abandonIntention: () => void) => ReactNode;
  onConflict?: () => void;
}

export function MutationForm<T = Record<string, unknown>>({ title, path, method, buildBody, onSaved, children, dirty,
  submitLabel = 'Salvar registro', verificationPath, verificationLabel = 'Verificar registro salvo', disabled = false,
  operationKey = '', responseId, expectedId, conflictReview, intentionReview, onConflict }: MutationFormProps<T>) {
  const session = useSession();
  const queries = useQueryClient();
  const drafts = useContext(Drafts)!;
  const writeKey = `write:${method}:${path}:${operationKey}`;
  const [state, setState] = useClinicalDraft<WriteState>(writeKey, { status: 'idle' });
  const [verifying, setVerifying] = useState(false);
  const sending = useRef(false);
  const allowNavigation = useRef(false);
  const alert = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const blocked = useBlocker(({ currentLocation, nextLocation }) => !allowNavigation.current
    && (dirty || sending.current || state.status === 'pending') && state.status !== 'saved'
    && `${currentLocation.pathname}${currentLocation.search}` !== `${nextLocation.pathname}${nextLocation.search}`);
  const busy = state.status === 'pending';
  const locked = busy || ['saved', 'uncertain', 'conflict', 'denied', 'not_applied'].includes(state.status);
  useEffect(() => { allowNavigation.current = false; }, [writeKey]);
  useEffect(() => {
    if ((dirty || busy) && state.status !== 'saved') drafts.unsaved.add(writeKey);
    else drafts.unsaved.delete(writeKey);
    // An inactive draft continues protecting reload until saved or explicitly abandoned.
  }, [drafts, writeKey, dirty, busy, state.status]);
  useBeforeUnload(useCallback(event => {
    if ((dirty && state.status !== 'saved') || sending.current) { event.preventDefault(); event.returnValue = ''; }
  }, [dirty, state.status]));
  useEffect(() => { if (state.message && state.status !== 'saved') alert.current?.focus(); }, [state]);
  useEffect(() => {
    if (blocked.state !== 'blocked' || !dialog.current) return;
    const popup = dialog.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (typeof popup.showModal === 'function') popup.showModal();
    else popup.setAttribute('open', '');
    popup.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    return () => {
      popup.close?.();
      if (previousFocus?.isConnected && !previousFocus.closest('[hidden], [inert]')
        && !previousFocus.matches(':disabled') && getComputedStyle(previousFocus).display !== 'none'
        && getComputedStyle(previousFocus).visibility !== 'hidden') previousFocus.focus();
    };
  }, [blocked.state]);

  function confirm(data: T, intention?: ClinicalIntention) {
    const ids = data && typeof data === 'object' ? Object.entries(data).filter(([key, value]) =>
      (responseId ? key === responseId : key.endsWith('Id')) && typeof value === 'string' && /^[1-9]\d{0,18}$/.test(value)) : [];
    if (!ids.length || (expectedId !== undefined && ids[0]![1] !== expectedId)) throw new ApiError(502);
    allowNavigation.current = true;
    drafts.unsaved.delete(writeKey);
    setState({ status: 'saved', message: 'Registro salvo.', intention });
    onSaved?.(data);
    void queries.invalidateQueries({ queryKey: ['clinical'], refetchType: 'active' });
  }

  async function recover(close = false) {
    if (!state.intention || verifying) return;
    const intention = state.intention;
    const generation = session.client.generation;
    setVerifying(true);
    try {
      const outcome = await verifyIntention(session.client, intention, close);
      if (session.client.generation !== generation) throw aborted();
      if (outcome.estado === 'confirmada') {
        confirm(outcome.resultado as T, intention);
      } else if (outcome.estado === 'nao_aplicada') {
        setState({ status: 'not_applied', intention,
          message: 'O servidor confirmou que este envio não foi aplicado. Os dados permanecem em rascunho. Revise antes de preparar um novo envio.' });
      } else {
        setState({ status: 'uncertain', intention, message: outcome.estado === 'em_curso'
          ? 'O envio ainda está em processamento. Aguarde e verifique novamente; nenhum dado foi reenviado.'
          : 'O resultado ainda não pôde ser determinado. Verifique novamente ou encerre esta tentativa antes de preparar outra. Nenhum dado foi reenviado.' });
      }
    } catch (error) {
      if (isAbort(error)) return;
      setState({ status: 'uncertain', intention,
        message: 'Não foi possível verificar este envio com o acesso atual. O rascunho está preservado e o reenvio permanece bloqueado.' });
    } finally { setVerifying(false); }
  }

  async function revalidateAccess() {
    if (verifying) return;
    const generation = session.client.generation;
    setVerifying(true);
    try {
      const patientPath = path.match(/^\/pacientes\/[1-9]\d*(?=\/|$)/)?.[0];
      if (patientPath) await session.client.get(patientPath);
      else {
        const capabilities = await session.client.get<{ podeCadastrar: boolean }>('/pacientes/capacidades');
        if (!capabilities.podeCadastrar) throw new ApiError(403);
      }
      if (session.client.generation !== generation) throw aborted();
      setState({ status: 'idle', message: 'O contexto está disponível para revisão. Confirme novamente para salvar; a autorização de escrita será revalidada pelo servidor.' });
    } catch (error) {
      if (isAbort(error)) return;
      setState(previous => ({ ...previous, message: 'O acesso ainda não pôde ser revalidado. O rascunho permanece preservado.' }));
    } finally { setVerifying(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current || locked || disabled || session.user?.perfil === 'consulta') return;
    let body: unknown;
    try { body = buildBody(); }
    catch (error) {
      setState({ status: 'error', message: error instanceof Error ? error.message : 'Revise os campos antes de salvar.' });
      return;
    }
    sending.current = true;
    const requestGeneration = session.client.generation;
    setState({ status: 'pending' });
    let intention: ClinicalIntention | undefined;
    let submitted = false;
    try {
      const hash = await clinicalHash(body);
      if (session.client.generation !== requestGeneration) throw aborted();
      intention = { operacaoId: crypto.randomUUID(), metodo: method, caminho: `/v1${path}`, corpoHash: hash };
      setState({ status: 'pending', intention });
      await registerIntention(session.client, intention);
      if (session.client.generation !== requestGeneration) throw aborted();
      submitted = true;
      const data = await session.client.request<T>(path, { method, body, operationId: intention.operacaoId });
      if (session.client.generation !== requestGeneration) throw aborted();
      confirm(data, intention);
    } catch (error) {
      if (isAbort(error)) {
        setState(intention ? { status: 'uncertain', intention,
          message: submitted
            ? 'Não foi possível confirmar se a operação foi salva. A identificação foi preservada; verifique seu resultado antes de preparar outro envio.'
            : 'Não foi possível confirmar o registro da tentativa. A identificação foi preservada para verificação; nenhuma escrita clínica foi enviada.' }
          : { status: 'error', message: 'A preparação foi interrompida antes de registrar a tentativa. O rascunho está disponível para revisão; nenhuma escrita clínica foi enviada.' });
        return;
      }
      const safe = error instanceof ApiError ? error : new ApiError(0);
      if (!submitted && intention && (safe.status === 0 || safe.status >= 500 || safe.status === 409)) {
        setState({ status: 'uncertain', intention,
          message: 'Não foi possível confirmar o registro da tentativa. A identificação foi preservada para verificação; nenhuma escrita clínica foi enviada.' });
      } else if (!submitted && safe.status !== 403) {
        setState({ status: 'error', message: 'Não foi possível preparar o envio. Nenhuma escrita clínica foi enviada. Revise a conexão e tente novamente.' });
      } else if (safe.status === 0 || safe.status >= 500) {
        setState({ status: 'uncertain', intention, message: 'Não foi possível confirmar se a operação foi salva. Consulte o registro antes de qualquer nova operação. Este envio não será repetido automaticamente.' });
      } else {
        setState({ status: safe.status === 409 ? 'conflict' : safe.status === 403 ? 'denied' : 'error', intention, message: safe.message });
        if (safe.status === 409) onConflict?.();
        if (safe.status === 403) void queries.invalidateQueries({ queryKey: ['clinical'], refetchType: 'active' });
      }
    } finally { sending.current = false; }
  }

  return <>
    <form onSubmit={event => { void submit(event); }} aria-label={title} aria-busy={busy}>
      {state.message && <div className={state.status === 'saved' ? 'notice' : 'error-state'}
        role={state.status === 'saved' ? 'status' : 'alert'} ref={alert} tabIndex={-1}>
        <p>{state.message}</p>
        {verificationPath && ['saved', 'uncertain', 'conflict'].includes(state.status)
          && <Link to={verificationPath}>{verificationLabel}</Link>}
      </div>}
      {state.status === 'uncertain' && state.intention && <div className="form-actions" aria-live="polite">
        <button type="button" className="button button-secondary" disabled={verifying} onClick={() => { void recover(); }}>Verificar resultado do envio</button>
        <button type="button" className="button button-secondary" disabled={verifying} onClick={() => { void recover(true); }}>Encerrar tentativa e verificar</button>
        {verifying && <span role="status">Verificando o resultado…</span>}
      </div>}
      {state.status === 'not_applied' && <button type="button" className="button button-secondary"
        onClick={() => setState({ status: 'idle', message: 'Rascunho disponível para revisão. Salvar exigirá uma nova confirmação.' })}>Revisar e preparar novo envio</button>}
      {state.status === 'denied' && <button type="button" className="button button-secondary" disabled={verifying}
        onClick={() => { void revalidateAccess(); }}>Revalidar acesso e revisar rascunho</button>}
      {state.status === 'conflict' && conflictReview?.(() => {
        drafts.unsaved.delete(writeKey);
        setState({ status: 'idle' });
      })}
      {intentionReview?.(() => {
        drafts.unsaved.delete(writeKey);
        setState({ status: 'idle' });
      })}
      <fieldset disabled={locked} className="form-body"><legend className="sr-only">{title}</legend>{children}</fieldset>
      <div className="form-actions"><button type="submit" className="button" disabled={locked || disabled || !dirty}>
        {busy ? 'Salvando…' : submitLabel}</button>
        {dirty && state.status !== 'saved' && <span className="muted">Alterações em rascunho; ainda não confirmadas.</span>}
      </div>
    </form>
    {blocked.state === 'blocked' && createPortal(<dialog ref={dialog} className="draft-dialog" aria-labelledby="draft-title"
      onKeyDown={event => {
        if (event.key !== 'Tab') return;
        const controls = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}
      onCancel={event => { event.preventDefault(); blocked.reset(); }}>
      <h2 id="draft-title">Alterações não salvas</h2>
      <p>{busy ? 'Aguarde a confirmação da operação antes de sair.'
        : 'O rascunho ficará nesta sessão. Sair da conta ou recarregar a página apaga os dados não salvos.'}</p>
      <div className="form-actions"><button type="button" className="button" onClick={() => blocked.reset()}>Continuar editando</button>
        <button type="button" className="button button-secondary" disabled={busy} onClick={() => blocked.proceed()}>Sair e manter rascunho</button></div>
    </dialog>, document.body)}
  </>;
}

export function EditingGate({ children }: { children: ReactNode }) {
  const session = useSession();
  return session.user?.perfil === 'consulta'
    ? <Card><h2>Acesso de consulta</h2><p>Seu perfil permite consultar os registros. O cadastro e a edição exigem autorização de escrita.</p></Card>
    : <>{children}</>;
}

export type CatalogItem = { id: string; codigo: string; nome: string; ativo: boolean };
