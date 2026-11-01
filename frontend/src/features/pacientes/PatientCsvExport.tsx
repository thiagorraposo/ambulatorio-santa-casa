import { useEffect, useRef, useState } from 'react';
import { ApiError, isAbort } from '../../api/client';
import { useSession } from '../../app/session';

interface Scope { nome: string; sexo: string; limit: number; offset: number; available: boolean }

/** The existing H16 resource authorizes all three profiles; no CSV is cached. */
export default function PatientCsvExport({ nome, sexo, limit, offset, available }: Scope) {
  const session = useSession();
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState<'idle' | 'busy' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<ApiError | null>(null);
  const start = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const controller = useRef<AbortController | null>(null);
  const objectUrl = useRef<string | null>(null);
  const cleanupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sending = useRef(false);
  const opened = useRef(false);
  const mounted = useRef(true);
  const busy = status === 'busy';
  const authorized = session.status === 'authenticated' && !session.identityError;

  const release = () => {
    if (cleanupTimer.current) clearTimeout(cleanupTimer.current);
    cleanupTimer.current = null;
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
  };
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; controller.current?.abort(); release(); };
  }, [nome, sexo, limit, offset, session.generation]);
  useEffect(() => {
    if (confirming) cancel.current?.focus();
    else if (opened.current) start.current?.focus();
  }, [confirming, status]);
  useEffect(() => {
    controller.current?.abort();
    sending.current = false;
    setConfirming(false); setStatus('idle'); setError(null); release();
  }, [nome, sexo, limit, offset, session.generation]);

  useEffect(() => {
    if (!available || !authorized) {
      controller.current?.abort(); sending.current = false;
      setConfirming(false); setStatus('idle'); setError(null); release();
    }
  }, [available, authorized]);

  const close = () => {
    controller.current?.abort();
    sending.current = false;
    setConfirming(false); setStatus('idle'); setError(null);
    start.current?.focus();
  };
  const download = async () => {
    if (sending.current || !confirming || !available || !authorized) return;
    const pending = new AbortController();
    controller.current?.abort();
    controller.current = pending;
    const generation = session.client.generation;
    sending.current = true; setStatus('busy'); setError(null);
    const filters = new URLSearchParams();
    if (nome) filters.set('nome', nome);
    if (sexo) filters.set('sexo', sexo);
    filters.set('limit', String(limit)); filters.set('offset', String(offset));
    try {
      const csv = await session.client.getCsv(`/pacientes/export.csv?${filters}`, pending.signal);
      if (!mounted.current || pending.signal.aborted || generation !== session.client.generation) return;
      if (!csv.startsWith('paciente_id,nome\n') && !csv.startsWith('paciente_id,nome\r\n')) throw new ApiError(502);
      release();
      objectUrl.current = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
      const anchor = document.createElement('a');
      anchor.href = objectUrl.current; anchor.download = 'pacientes-pagina.csv'; anchor.hidden = true;
      document.body.append(anchor);
      try { anchor.click(); } finally { anchor.remove(); }
      cleanupTimer.current = setTimeout(release, 1000);
      setStatus('ready'); setConfirming(false); start.current?.focus();
    } catch (failure) {
      if (!mounted.current || pending.signal.aborted || generation !== session.client.generation || isAbort(failure)) return;
      release();
      setError(failure instanceof ApiError ? failure : new ApiError(0)); setStatus('error');
    } finally {
      if (controller.current === pending) { controller.current = null; sending.current = false; }
    }
  };
  return <section className="form-section" aria-label="Exportação da página de pacientes" onKeyDown={event => {
    if (confirming && event.key === 'Escape') { event.preventDefault(); close(); }
  }}>
    <button ref={start} type="button" className="button button-secondary" disabled={!available || !authorized || busy}
      onClick={() => { opened.current = true; setConfirming(true); setStatus('idle'); setError(null); }}>Exportar CSV desta página</button>
    <p className="muted">Exporta somente ID e nome da página e dos filtros aplicados, conforme seu acesso. Não é uma exportação de todos os pacientes ou do dashboard.</p>
    {confirming && <div aria-labelledby="csv-scope-heading">
      <h3 id="csv-scope-heading">Confirmar exportação da página</h3>
      <p>Campos: ID e nome.</p>
      <dl className="record-grid">
        <div><dt>Nome aplicado</dt><dd>{nome || 'Sem filtro'}</dd></div>
        <div><dt>Sexo aplicado</dt><dd>{sexo || 'Todos'}</dd></div>
        <div><dt>Limite da página</dt><dd>{limit}</dd></div>
        <div><dt>Deslocamento da página</dt><dd>{offset}</dd></div>
      </dl>
      <button ref={cancel} type="button" className="button button-secondary" onClick={close}>Cancelar exportação</button>
      <button type="button" className="button" disabled={busy || !available || !authorized} onClick={() => { void download(); }}>Confirmar exportação CSV</button>
    </div>}
    {busy && <p role="status">Preparando arquivo CSV…</p>}
    {status === 'ready' && <p role="status">Arquivo CSV preparado para download.</p>}
    {status === 'error' && <p role="alert">{error?.message}</p>}
  </section>;
}
