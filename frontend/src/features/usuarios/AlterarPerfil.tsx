import { useEffect, useId, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import type { UsuarioResumo } from '../../api/contracts';
import { useSession } from '../../app/session';
import { useClinicalDraft } from '../../shared/writing';
import { Card } from '../../shared/ui';

type Perfil = UsuarioResumo['perfil'];
export const profiles = { consulta: 'Consulta', edicao: 'Edição', administracao: 'Administração' };
export interface PerfilRecibo {
  operacaoId: string; usuarioId: string; atorUsuarioId: string; operacao: 'perfil'; instante: string;
  resultado: 'aplicada' | 'autoacao_proibida' | 'alvo_inexistente' | 'versao_obsoleta' | 'ultimo_administrador' | 'perfil_inalterado';
  anterior: Perfil | null; novo: Perfil; versaoAnterior: string | null; versaoNova: string | null; justificativa: string;
}
const outcomes = {
  aplicada: 'Alteração de perfil confirmada.', autoacao_proibida: 'Não é permitido alterar o próprio perfil. Procure outro administrador.',
  alvo_inexistente: 'A conta não está disponível.', versao_obsoleta: 'A conta mudou desde a leitura. Compare o estado atual antes de revisar novamente.',
  ultimo_administrador: 'O último administrador ativo está protegido.', perfil_inalterado: 'O perfil escolhido já era o perfil da conta.',
};
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export function AlterarPerfil({ user }: { user: UsuarioResumo }) {
  const session = useSession();
  const queries = useQueryClient();
  const [params, setParams] = useSearchParams();
  const draftKey = `perfil:${user.usuarioId}`;
  const [baseline, setBaseline] = useClinicalDraft(`${draftKey}:baseline`, user);
  const [choice, setChoice] = useClinicalDraft<Perfil>(`${draftKey}:choice`, user.perfil);
  const [reason, setReason] = useClinicalDraft(`${draftKey}:reason`, '');
  const [operationId, setOperationId] = useClinicalDraft(`${draftKey}:operation`, params.get('operacao') ?? '');
  const [state, setState] = useClinicalDraft<'idle' | 'review' | 'pending' | 'uncertain' | 'receipt' | 'invalid'>(`${draftKey}:state`, operationId ? 'uncertain' : 'idle');
  const [receipt, setReceipt] = useClinicalDraft<PerfilRecibo | undefined>(`${draftKey}:receipt`, undefined);
  const [message, setMessage] = useClinicalDraft(`${draftKey}:message`, '');
  const [reading, setReading] = useState(false);
  const sending = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const reviewButton = useRef<HTMLButtonElement>(null);
  const status = useRef<HTMLDivElement>(null);
  const fieldId = useId();
  const path = `/usuarios/${encodeURIComponent(user.usuarioId)}`;
  const locked = state !== 'idle';
  useEffect(() => {
    if (state !== 'review') return;
    const element = dialog.current;
    element?.showModal();
    element?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => { element?.close(); reviewButton.current?.focus(); };
  }, [state]);
  useEffect(() => { if (message || receipt) status.current?.focus(); }, [message, receipt]);

  async function reload() {
    const current = await session.client.get<UsuarioResumo>(path);
    setBaseline(current);
    queries.setQueryData(['clinical', session.generation, path], current);
    return current;
  }
  function remember(id: string) {
    setOperationId(id);
    setParams(previous => { const next = new URLSearchParams(previous); next.set('operacao', id); return next; }, { replace: true });
  }
  async function verify() {
    if (!uuid.test(operationId) || reading || sending.current) return;
    remember(operationId); setReading(true); setMessage(''); setState('uncertain');
    try {
      const found = await session.client.get<PerfilRecibo>(`${path}/operacoes/${operationId}`);
      if (found.usuarioId !== user.usuarioId || found.operacaoId !== operationId || found.operacao !== 'perfil'
        || !Object.hasOwn(outcomes, found.resultado)) throw new ApiError(502);
      setReceipt(found); setState('receipt');
      try { await reload(); } catch { setMessage('Recibo consultado. Não foi possível reler a conta atual; tente consultar novamente.'); }
    } catch (error) {
      setMessage(error instanceof ApiError && error.status === 403
        ? 'Consulta não autorizada. Procure um administrador autorizado da unidade.'
        : 'Recibo ainda não disponível. O resultado permanece indeterminado; consulte novamente sem reenviar.');
    } finally { setReading(false); }
  }
  async function confirm() {
    if (sending.current || state !== 'review' || !baseline.versao) return;
    sending.current = true; setState('pending'); setMessage(''); setReceipt(undefined);
    const id = crypto.randomUUID(); remember(id);
    try {
      const saved = await session.client.request<PerfilRecibo>(`${path}/perfil`, { method: 'POST', body: {
        operacaoId: id, versao: baseline.versao, perfil: choice, justificativa: reason.trim(),
      } });
      if (saved.operacaoId !== id || saved.usuarioId !== user.usuarioId || saved.resultado !== 'aplicada') throw new ApiError(502);
      setReceipt(saved); setState('receipt');
      try { await reload(); } catch { setMessage('Alteração confirmada pelo recibo. Falha ao reler o estado atual; consulte novamente.'); }
    } catch (error) {
      const code = error instanceof ApiError ? error.status : 0;
      setState(code === 400 ? 'invalid' : 'uncertain');
      setMessage(code === 409 ? 'Conflito: sua escolha e justificativa foram preservadas. Consulte o recibo e compare o estado atual.'
        : code === 400 ? 'Entrada recusada antes da alteração. Verifique perfil, versão e justificativa e prepare uma nova revisão.'
        : code === 403 ? 'Comando recusado por autorização. Consulte o resultado sem reenviar.'
        : 'Resposta não confirmada. Consulte o recibo sem repetir a alteração.');
    } finally { sending.current = false; }
  }
  async function prepare() {
    if (reading || receipt?.resultado === 'aplicada') return;
    setReading(true); setMessage('');
    try {
      await reload(); setState('idle'); setReceipt(undefined); setOperationId('');
      setParams(previous => { const next = new URLSearchParams(previous); next.delete('operacao'); return next; }, { replace: true });
      reviewButton.current?.focus();
    } catch { setMessage('Não foi possível reler a conta. A nova revisão continua bloqueada.'); }
    finally { setReading(false); }
  }

  if (session.user?.usuarioId === user.usuarioId) return <Card><h2>Alteração de perfil</h2>
    <p>Não é permitido alterar o próprio perfil. Procure outro administrador autorizado da unidade.</p></Card>;
  return <Card><h2>Alteração de perfil</h2>
    <p>Perfil na leitura para revisão: <strong>{profiles[baseline.perfil]}</strong>. Versão da conta: {baseline.versao ?? 'indisponível'}.</p>
    <form onSubmit={event => { event.preventDefault(); if (!locked && baseline.versao) setState('review'); }}>
      <div className="form-grid"><div className="form-field"><label htmlFor={`${fieldId}-perfil`}>Novo perfil</label><select id={`${fieldId}-perfil`} value={choice} disabled={locked}
        onChange={event => setChoice(event.target.value as Perfil)}>
        {Object.entries(profiles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></div>
      <div className="form-field"><label htmlFor={`${fieldId}-motivo`}>Justificativa</label><textarea id={`${fieldId}-motivo`} value={reason} minLength={10} maxLength={1000} required disabled={locked}
        onChange={event => setReason(event.target.value)} /></div></div>
      <p>As sessões da conta serão encerradas. Será necessário entrar novamente. Operações já confirmadas serão preservadas.</p>
      <button ref={reviewButton} className="button" type="submit" disabled={locked || !baseline.versao || choice === baseline.perfil || reason.trim().length < 10}>Revisar alteração</button>
    </form>
    <div ref={status} tabIndex={-1} role="status" aria-live="polite">
      {state === 'pending' && <p>Confirmando alteração…</p>}
      {message && <p>{message}</p>}
      {receipt && <><p>{outcomes[receipt.resultado]}</p><p>Recibo de {receipt.instante}: {receipt.anterior ? profiles[receipt.anterior] : 'Conta ausente'} → {profiles[receipt.novo]}.
        Ator: {receipt.atorUsuarioId}. Justificativa: {receipt.justificativa}</p>
        <p>Resultado histórico da operação; o perfil atual é apresentado acima.</p></>}
    </div>
    <label>Código da operação<input value={operationId} readOnly={Boolean(params.get('operacao'))} disabled={state === 'pending' || reading}
      onChange={event => { setOperationId(event.target.value.trim()); setReceipt(undefined); setState('uncertain'); }} /></label>
    <button className="button button-secondary" disabled={!uuid.test(operationId) || reading || state === 'pending'} onClick={() => void verify()}>
      {reading ? 'Consultando…' : 'Consultar resultado'}</button>
    {(state === 'invalid' || (receipt && receipt.resultado !== 'aplicada')) && <button className="button button-secondary" disabled={reading} onClick={() => void prepare()}>Preparar nova revisão</button>}
    {receipt?.resultado === 'aplicada' && <p>Para outra alteração, abra novamente o detalhe da conta após conferir o resultado.</p>}
    <dialog className="draft-dialog" ref={dialog} aria-labelledby="perfil-review-title" onClick={event => {
      if (event.target !== event.currentTarget) return;
      const box = event.currentTarget.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) setState('idle');
    }} onCancel={event => { event.preventDefault(); setState('idle'); }}>
      <div className="dialog-heading"><h2 id="perfil-review-title">Confirmar alteração de perfil</h2>
      <button className="button button-secondary" aria-label="Fechar revisão" onClick={() => setState('idle')}>×</button></div>
      <p>{user.nome} · {user.login} · ID {user.usuarioId}</p>
      <p>{profiles[baseline.perfil]} → {profiles[choice]} · Versão {baseline.versao}</p>
      <p>Justificativa: {reason.trim()}</p><p>As sessões desta conta serão encerradas. Será necessário entrar novamente.</p>
      <div className="form-actions"><button className="button button-secondary" onClick={() => setState('idle')}>Cancelar</button>
      <button className="button" onClick={() => void confirm()}>Confirmar alteração</button></div>
    </dialog>
  </Card>;
}
