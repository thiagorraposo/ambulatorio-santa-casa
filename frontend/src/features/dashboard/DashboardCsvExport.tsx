import { useEffect, useRef, useState } from 'react';
import { ApiError, isAbort } from '../../api/client';
import { useSession } from '../../app/session';

export default function DashboardCsvExport({ filters, total, available }: { filters: string; total: number; available: boolean }) {
  const session = useSession();
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  const start = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const objectUrl = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function release() { if (timer.current) clearTimeout(timer.current); if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); objectUrl.current = null; }
  useEffect(() => () => { request.current?.abort(); release(); }, [filters, session.generation]);
  useEffect(() => { if (confirming) cancel.current?.focus(); }, [confirming]);
  const authorized = session.status === 'authenticated' && !session.identityError;
  const allowed = available && authorized && total <= 5000;
  function close() { request.current?.abort(); request.current = null; setBusy(false); setConfirming(false); start.current?.focus(); }
  async function download() {
    if (!allowed || !confirming || request.current) return;
    const controller = new AbortController(); request.current = controller;
    const generation = session.client.generation;
    setBusy(true); setError(''); setStatus('');
    try {
      const csv = await session.client.getCsv(`/dashboard/export.csv?${filters}`, controller.signal);
      if (controller.signal.aborted || generation !== session.client.generation) return;
      release();
      objectUrl.current = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
      const anchor = document.createElement('a'); anchor.href = objectUrl.current; anchor.download = 'dashboard-atendimentos.csv'; anchor.hidden = true; document.body.append(anchor);
      try { anchor.click(); } finally { anchor.remove(); }
      timer.current = setTimeout(release, 1000);
      setStatus('Arquivo CSV preparado para download.'); setConfirming(false); start.current?.focus();
    } catch (failure) {
      if (controller.signal.aborted || generation !== session.client.generation || isAbort(failure)) return;
      setError(failure instanceof ApiError && failure.status === 400 ? 'Não foi possível exportar este recorte. Revise os filtros; o limite é de 5.000 atendimentos por arquivo.' : failure instanceof ApiError ? failure.message : new ApiError(0).message);
    } finally { if (request.current === controller) { request.current = null; setBusy(false); } }
  }
  return <section className="dashboard-export" aria-label="Exportação dos resultados do dashboard" onKeyDown={event => { if (confirming && event.key === 'Escape') { event.preventDefault(); close(); } }}>
    <button ref={start} type="button" className="button button-secondary" disabled={!allowed || busy} onClick={() => { setConfirming(true); setError(''); setStatus(''); }}>Exportar CSV</button>
    <p className="muted">Todos os resultados filtrados, na ordem aplicada. Limite: 5.000 atendimentos.</p>
    {total > 5000 && <p role="status">Há mais de 5.000 resultados. Refine os filtros para exportar.</p>}
    {confirming && <div className="dashboard-export-confirmation" aria-labelledby="dashboard-export-title"><h3 id="dashboard-export-title">Confirmar exportação do dashboard</h3><p>Exportar até {total.toLocaleString('pt-BR')} atendimentos autorizados em todas as páginas, com os filtros e a ordenação aplicados. O arquivo contém ID e nome do paciente, ID e data do atendimento e quantidade de pendências abertas. A operação será auditada.</p><div className="form-actions"><button ref={cancel} type="button" className="button button-secondary" onClick={close}>Cancelar exportação</button><button type="button" className="button" disabled={busy || !allowed} onClick={() => void download()}>Confirmar exportação CSV</button></div></div>}
    {busy && <p role="status">Preparando arquivo CSV…</p>}{status && <p role="status">{status}</p>}{error && <p role="alert">{error}</p>}
  </section>;
}
