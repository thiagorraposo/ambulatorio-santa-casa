import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import type { UsuarioResumo } from '../../api/contracts';
import { ApiError } from '../../api/client';
import { useSession } from '../../app/session';
import { Card } from '../../shared/ui';

interface Recibo {
  operacaoId: string; usuarioId: string; atorUsuarioId: string; instante: string;
  operacao: 'recuperacao'; resultado: 'aplicada' | 'versao_obsoleta' | 'recuperacao_proibida';
}
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export default function RecuperarCredencial({ user }: { user: UsuarioResumo }) {
  const session = useSession();
  const queries = useQueryClient();
  const [baseline, setBaseline] = useState(user);
  const [params, setParams] = useSearchParams();
  const [operation, setOperation] = useState(params.get('recuperacao') ?? '');
  const [state, setState] = useState<'idle' | 'review' | 'pending' | 'uncertain' | 'receipt'>(operation ? 'uncertain' : 'idle');
  const [reason, setReason] = useState('');
  const [receipt, setReceipt] = useState<Recibo>();
  const [credential, setCredential] = useState<{ value: string; expires: string }>();
  const [message, setMessage] = useState('');
  const [reading, setReading] = useState(false);
  const sending = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const review = useRef<HTMLButtonElement>(null);
  const status = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state !== 'review') return;
    const node = dialog.current; node?.showModal(); node?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => { node?.close(); review.current?.focus(); };
  }, [state]);
  useEffect(() => { if (message || receipt) status.current?.focus(); }, [message, receipt]);
  function remember(id: string) { setOperation(id); setParams(previous => { const next = new URLSearchParams(previous); next.set('recuperacao', id); return next; }, { replace: true }); }
  function accept(found: Recibo, id: string) {
    if (found.operacaoId !== id || found.usuarioId !== user.usuarioId || found.operacao !== 'recuperacao' || !['aplicada', 'versao_obsoleta', 'recuperacao_proibida'].includes(found.resultado)) throw new ApiError(502);
    setReceipt(found); setState('receipt');
  }
  async function confirm() {
    if (sending.current || state !== 'review') return;
    sending.current = true; setState('pending'); setMessage('');
    const id = crypto.randomUUID(); remember(id);
    try {
      const response = await session.client.request<{ recibo: Recibo; credencialTemporaria?: string; expiraEm?: string }>(`/usuarios/${user.usuarioId}/credencial`, { method: 'POST', body: { operacaoId: id, versao: baseline.versao, justificativa: reason.trim() } });
      accept(response.recibo, id);
      if (response.recibo.resultado === 'aplicada' && response.credencialTemporaria && response.expiraEm) setCredential({ value: response.credencialTemporaria, expires: response.expiraEm });
    } catch (error) {
      const code = error instanceof ApiError ? error.status : 0;
      setState(code === 400 ? 'idle' : 'uncertain'); setMessage(code === 400 ? 'Revise a justificativa antes de uma nova confirmação.' : 'Resposta não confirmada. Consulte o resultado sem repetir a recuperação.');
    } finally { sending.current = false; }
  }
  async function verify() {
    if (reading || sending.current || !uuid.test(operation)) return;
    setReading(true); setMessage('');
    try { accept(await session.client.get<Recibo>(`/usuarios/credenciais/${operation}`), operation); }
    catch { setMessage('Recibo ainda não disponível ou consulta não autorizada. Resultado indeterminado; não reenvie a recuperação.'); }
    finally { setReading(false); }
  }
  if (user.perfil === 'administracao' && !operation) return <Card><h2>Recuperação de credencial</h2><p>Contas administrativas exigem recuperação pela infraestrutura autorizada. Procure um administrador autorizado da unidade.</p></Card>;
  return <Card><h2>Recuperação de credencial</h2><p>Emita uma nova credencial temporária para uma conta não administrativa. As credenciais e sessões anteriores serão invalidadas; a nova senha será obrigatória no próximo acesso.</p>
    <form onSubmit={event => { event.preventDefault(); if (state === 'idle') setState('review'); }}>
      <div className="form-field"><label htmlFor="recuperacao-motivo">Justificativa da recuperação</label><textarea id="recuperacao-motivo" required minLength={10} maxLength={1000} disabled={state !== 'idle'} value={reason} onChange={event => setReason(event.target.value)} /></div>
      <button className="button button-secondary" ref={review} disabled={state !== 'idle' || reason.trim().length < 10}>Revisar recuperação</button>
    </form>
    <div role="status" tabIndex={-1} ref={status}>{state === 'pending' && <p>Emitindo credencial…</p>}{message && <p>{message}</p>}
      {receipt && <><p>{receipt.resultado === 'aplicada' ? 'Recuperação confirmada.' : receipt.resultado === 'versao_obsoleta' ? 'A conta mudou. Consulte o estado atual antes de preparar outra recuperação.' : 'Recuperação não autorizada para esta conta.'}</p><p>Recibo: {receipt.operacaoId}. Ator: {receipt.atorUsuarioId}. Instante: {receipt.instante}.</p>
        {!credential && receipt.resultado === 'aplicada' && <p>A credencial não pode ser consultada novamente. Se não foi entregue, uma nova recuperação deve ser preparada após reler a conta.</p>}</>}
    </div>
    {credential && <section className="notice" aria-labelledby="recuperacao-segredo"><h3 id="recuperacao-segredo">Credencial temporária — exibição única</h3><p>Entregue por canal seguro fora do aplicativo. Não salve em documentos ou capturas.</p><label htmlFor="recuperacao-credencial">Nova credencial temporária</label><input id="recuperacao-credencial" autoComplete="off" className="mono" readOnly value={credential.value} /><p>Expira em: {new Date(credential.expires).toLocaleString('pt-BR')}.</p><button className="button button-secondary" onClick={() => setCredential(undefined)}>Encerrar exibição da nova credencial</button></section>}
    {operation && <><p>Código da recuperação: <span className="mono">{operation}</span></p><button className="button button-secondary" disabled={reading || state === 'pending'} onClick={() => void verify()}>{reading ? 'Consultando…' : 'Consultar resultado da recuperação'}</button></>}
    {receipt && <button className="button button-secondary" onClick={async () => {
      setReading(true); try {
        const fresh = await session.client.get<UsuarioResumo>(`/usuarios/${user.usuarioId}`);
        if (fresh.perfil === 'administracao') { setMessage('Conta administrativa: recuperação pela infraestrutura autorizada.'); return; }
        setParams(previous => { const next = new URLSearchParams(previous); next.delete('recuperacao'); return next; }, { replace: true });
        setBaseline(fresh); setReceipt(undefined); setCredential(undefined); setOperation(''); setMessage(''); setState('idle');
        queries.setQueryData(['clinical', session.generation, `/usuarios/${user.usuarioId}`], fresh);
      } catch { setMessage('Não foi possível reler a conta. A nova recuperação permanece bloqueada.'); } finally { setReading(false); }
    }} disabled={reading}>Reler conta para outra recuperação</button>}
    <dialog className="draft-dialog" ref={dialog} aria-labelledby="recuperacao-review-title" onCancel={event => { event.preventDefault(); setState('idle'); }}>
      <div className="dialog-heading"><h2 id="recuperacao-review-title">Confirmar recuperação de credencial</h2><button className="button button-secondary" aria-label="Fechar revisão da recuperação" onClick={() => setState('idle')}>×</button></div>
      <p>{user.nome} · {user.login} · Versão {baseline.versao}</p><p>Justificativa: {reason.trim()}</p><p>As credenciais e sessões anteriores serão invalidadas. Entregue a nova credencial por canal seguro; a troca será obrigatória.</p>
      <div className="form-actions"><button className="button button-secondary" onClick={() => setState('idle')}>Cancelar recuperação</button><button className="button" onClick={() => void confirm()}>Confirmar recuperação</button></div>
    </dialog>
  </Card>;
}
