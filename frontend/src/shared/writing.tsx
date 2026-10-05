import { createContext, useCallback, useContext, useEffect, useRef, useState,
  useSyncExternalStore, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from 'react';
import { createPortal } from 'react-dom';
import { Link, useBeforeUnload, useBlocker } from 'react-router';
import { useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { aborted, ApiError, isAbort } from '../api/client';
import { useSession } from '../app/session';
import { ApiErrorState, Card } from './ui';

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

type WriteState = { status: 'idle' | 'pending' | 'saved' | 'error' | 'uncertain' | 'conflict' | 'denied'; message?: string };
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
}

export function MutationForm<T = Record<string, unknown>>({ title, path, method, buildBody, onSaved, children, dirty,
  submitLabel = 'Salvar registro', verificationPath, verificationLabel = 'Verificar registro salvo', disabled = false,
  operationKey = '', responseId, expectedId, conflictReview }: MutationFormProps<T>) {
  const session = useSession();
  const queries = useQueryClient();
  const drafts = useContext(Drafts)!;
  const writeKey = `write:${method}:${path}:${operationKey}`;
  const [state, setState] = useClinicalDraft<WriteState>(writeKey, { status: 'idle' });
  const sending = useRef(false);
  const allowNavigation = useRef(false);
  const alert = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const blocked = useBlocker(({ currentLocation, nextLocation }) => !allowNavigation.current
    && (dirty || sending.current) && state.status !== 'saved'
    && `${currentLocation.pathname}${currentLocation.search}` !== `${nextLocation.pathname}${nextLocation.search}`);
  const busy = state.status === 'pending';
  const locked = busy || ['saved', 'uncertain', 'conflict', 'denied'].includes(state.status);
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
    try {
      const data = await session.client.request<T>(path, { method, body });
      if (session.client.generation !== requestGeneration) throw aborted();
      const ids = data && typeof data === 'object' ? Object.entries(data).filter(([key, value]) =>
        (responseId ? key === responseId : key.endsWith('Id')) && typeof value === 'string' && /^[1-9]\d{0,18}$/.test(value)) : [];
      if (!ids.length || (expectedId !== undefined && ids[0]![1] !== expectedId)) throw new ApiError(502);
      allowNavigation.current = true;
      drafts.unsaved.delete(writeKey);
      setState({ status: 'saved', message: 'Registro salvo.' });
      onSaved?.(data);
      void queries.invalidateQueries({ queryKey: ['clinical'], refetchType: 'active' });
    } catch (error) {
      if (isAbort(error)) {
        setState({ status: 'uncertain', message: 'Não foi possível confirmar se a operação foi salva. A consulta de acesso interrompeu a confirmação. Verifique o registro antes de qualquer nova operação.' });
        return;
      }
      const safe = error instanceof ApiError ? error : new ApiError(0);
      if (safe.status === 0 || safe.status >= 500) {
        setState({ status: 'uncertain', message: 'Não foi possível confirmar se a operação foi salva. Consulte o registro antes de qualquer nova operação. Este envio não será repetido automaticamente.' });
      } else {
        setState({ status: safe.status === 409 ? 'conflict' : safe.status === 403 ? 'denied' : 'error', message: safe.message });
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
      {state.status === 'conflict' && conflictReview?.(() => {
        drafts.unsaved.delete(writeKey);
        setState({ status: 'idle' });
      })}
      <fieldset disabled={busy || state.status === 'saved'} className="form-body"><legend className="sr-only">{title}</legend>{children}</fieldset>
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
