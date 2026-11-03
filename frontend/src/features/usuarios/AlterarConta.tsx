import { useEffect, useId, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import type { UsuarioResumo } from '../../api/contracts';
import { useSession } from '../../app/session';
import { useClinicalDraft } from '../../shared/writing';
import { Card } from '../../shared/ui';

type Perfil = UsuarioResumo['perfil'];
type Escolha = Perfil | 'ativa' | 'inativa';
function valueText(value: Perfil | boolean | null) { return typeof value === 'boolean' ? value ? 'Ativa' : 'Inativa' : value ? profiles[value] : 'Conta ausente'; }
export const profiles = { consulta: 'Consulta', edicao: 'Edição', administracao: 'Administração' };
export interface ContaRecibo {
  operacaoId: string; usuarioId: string; atorUsuarioId: string; operacao: 'perfil' | 'estado'; instante: string;
  resultado: 'aplicada' | 'autoacao_proibida' | 'alvo_inexistente' | 'versao_obsoleta' | 'ultimo_administrador' | 'perfil_inalterado' | 'estado_inalterado';
  anterior: Perfil | boolean | null; novo: Perfil | boolean; versaoAnterior: string | null; versaoNova: string | null; justificativa: string;
}
const outcomes = {
  aplicada: 'Alteração confirmada.', autoacao_proibida: 'Não é permitido alterar o próprio perfil. Procure outro administrador.',
  alvo_inexistente: 'A conta não está disponível.', versao_obsoleta: 'A conta mudou desde a leitura. Compare o estado atual antes de revisar novamente.',
  ultimo_administrador: 'O último administrador ativo está protegido.', perfil_inalterado: 'O perfil escolhido já era o perfil da conta.', estado_inalterado: 'A conta já estava na situação escolhida.',
};
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export function AlterarConta({ user, kind = 'perfil' }: { user: UsuarioResumo; kind?: 'perfil' | 'estado' }) {
  const session = useSession();
  const queries = useQueryClient();
  const [params, setParams] = useSearchParams();
  const draftKey = `conta:${user.usuarioId}:${kind}`;
  const [baseline, setBaseline] = useClinicalDraft(`${draftKey}:baseline`, user);
  const [choice, setChoice] = useClinicalDraft<Escolha>(`${draftKey}:choice`, kind === 'perfil' ? user.perfil : user.ativo ? 'ativa' : 'inativa');
  const [reason, setReason] = useClinicalDraft(`${draftKey}:reason`, '');
  const [operationId, setOperationId] = useClinicalDraft(`${draftKey}:operation`, (params.get('comando') ?? 'perfil') === kind ? params.get('operacao') ?? '' : '');
  const [state, setState] = useClinicalDraft<'idle' | 'review' | 'pending' | 'uncertain' | 'receipt' | 'invalid'>(`${draftKey}:state`, operationId ? 'uncertain' : 'idle');
  const [receipt, setReceipt] = useClinicalDraft<ContaRecibo | undefined>(`${draftKey}:receipt`, undefined);
  const [message, setMessage] = useClinicalDraft(`${draftKey}:message`, '');
  const [reading, setReading] = useState(false);
  const sending = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const reviewButton = useRef<HTMLButtonElement>(null);
  const status = useRef<HTMLDivElement>(null);
  const fieldId = useId();
  const path = `/usuarios/${encodeURIComponent(user.usuarioId)}`;
  const locked = state !== 'idle';
  const noun = kind === 'perfil' ? 'perfil' : 'situação da conta';
  const currentChoice = kind === 'perfil' ? baseline.perfil : baseline.ativo ? 'ativa' : 'inativa';
  const choices = kind === 'perfil' ? profiles : { ativa: 'Ativa', inativa: 'Inativa' };
  const switchParams = new URLSearchParams(params);
  switchParams.set('comando', kind === 'perfil' ? 'estado' : 'perfil'); switchParams.delete('operacao');
  const consequence = kind === 'perfil' ? 'As sessões da conta serão encerradas. Será necessário entrar novamente. Operações já confirmadas serão preservadas.'
    : choice === 'inativa' ? 'A conta perderá acesso e seus vínculos com pacientes serão revogados. As sessões serão encerradas. Operações já confirmadas serão preservadas.'
    : 'A conta poderá entrar novamente. Vínculos revogados não serão restaurados e sessões antigas continuarão inválidas.';
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
    setParams(previous => { const next = new URLSearchParams(previous); next.set('operacao', id); next.set('comando', kind); return next; }, { replace: true });
  }
  async function verify() {
    if (!uuid.test(operationId) || reading || sending.current) return;
    remember(operationId); setReading(true); setMessage(''); setState('uncertain');
    try {
      const found = await session.client.get<ContaRecibo>(`${path}/operacoes/${operationId}`);
      if (found.usuarioId !== user.usuarioId || found.operacaoId !== operationId || found.operacao !== kind
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
      const saved = await session.client.request<ContaRecibo>(`${path}/${kind}`, { method: 'POST', body: {
        operacaoId: id, versao: baseline.versao, ...(kind === 'perfil' ? { perfil: choice } : { ativo: choice === 'ativa' }), justificativa: reason.trim(),
      } });
      if (saved.operacaoId !== id || saved.usuarioId !== user.usuarioId || saved.resultado !== 'aplicada' || saved.operacao !== kind) throw new ApiError(502);
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
    if (reading) return;
    setReading(true); setMessage('');
    try {
      await reload(); setState('idle'); setReceipt(undefined); setOperationId('');
      setParams(previous => { const next = new URLSearchParams(previous); next.delete('operacao'); return next; }, { replace: true });
      reviewButton.current?.focus();
    } catch { setMessage('Não foi possível reler a conta. A nova revisão continua bloqueada.'); }
    finally { setReading(false); }
  }

  if (session.user?.usuarioId === user.usuarioId) return <Card><h2>Alteração de {noun}</h2>
    <p>Não é permitido alterar o próprio perfil ou situação da conta. Procure outro administrador autorizado da unidade.</p></Card>;
  return <Card><h2>Alteração de {noun}</h2>
    {!locked && <Link to={`${path}?${switchParams}`}>{kind === 'perfil' ? 'Alterar situação da conta' : 'Alterar perfil da conta'}</Link>}
    <p>Estado na leitura para revisão: <strong>{valueText(kind === 'perfil' ? baseline.perfil : baseline.ativo)}</strong>. Versão da conta: {baseline.versao ?? 'indisponível'}.</p>
    <form onSubmit={event => { event.preventDefault(); if (!locked && baseline.versao) setState('review'); }}>
      <div className="form-grid"><div className="form-field"><label htmlFor={`${fieldId}-perfil`}>{kind === 'perfil' ? 'Novo perfil' : 'Nova situação'}</label><select id={`${fieldId}-perfil`} value={choice} disabled={locked}
        onChange={event => setChoice(event.target.value as Escolha)}>
        {Object.entries(choices).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></div>
      <div className="form-field"><label htmlFor={`${fieldId}-motivo`}>Justificativa</label><textarea id={`${fieldId}-motivo`} value={reason} minLength={10} maxLength={1000} required disabled={locked}
        onChange={event => setReason(event.target.value)} /></div></div>
      <p>{consequence}</p>
      <button ref={reviewButton} className="button" type="submit" disabled={locked || !baseline.versao || choice === currentChoice || reason.trim().length < 10}>Revisar alteração</button>
    </form>
    <div ref={status} tabIndex={-1} role="status" aria-live="polite">
      {state === 'pending' && <p>Confirmando alteração…</p>}
      {message && <p>{message}</p>}
      {receipt && <><p>{receipt.resultado === 'aplicada' ? `Alteração de ${noun} confirmada.` : outcomes[receipt.resultado]}</p><p>Recibo de {receipt.instante}: {valueText(receipt.anterior)} → {valueText(receipt.novo)}.
        Ator: {receipt.atorUsuarioId}. Justificativa: {receipt.justificativa}</p>
        <p>Resultado histórico da operação; o estado atual é apresentado acima.</p></>}
    </div>
    <label>Código da operação<input value={operationId} readOnly={Boolean(params.get('operacao'))} disabled={state === 'pending' || reading}
      onChange={event => { setOperationId(event.target.value.trim()); setReceipt(undefined); setState('uncertain'); }} /></label>
    <button className="button button-secondary" disabled={!uuid.test(operationId) || reading || state === 'pending'} onClick={() => void verify()}>
      {reading ? 'Consultando…' : 'Consultar resultado'}</button>
    {(state === 'invalid' || receipt) && <button className="button button-secondary" disabled={reading} onClick={() => void prepare()}>{receipt?.resultado === 'aplicada' ? 'Preparar nova alteração' : 'Preparar nova revisão'}</button>}
    {receipt?.resultado === 'aplicada' && <p>Para outra alteração, prepare uma nova intenção após conferir o resultado.</p>}
    <dialog className="draft-dialog" ref={dialog} aria-labelledby="perfil-review-title" onClick={event => {
      if (event.target !== event.currentTarget) return;
      const box = event.currentTarget.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) setState('idle');
    }} onCancel={event => { event.preventDefault(); setState('idle'); }}>
      <div className="dialog-heading"><h2 id="perfil-review-title">Confirmar alteração de {noun}</h2>
      <button className="button button-secondary" aria-label="Fechar revisão" onClick={() => setState('idle')}>×</button></div>
      <p>{user.nome} · {user.login} · ID {user.usuarioId}</p>
      <p>{valueText(kind === 'perfil' ? baseline.perfil : baseline.ativo)} → {valueText(kind === 'perfil' ? choice as Perfil : choice === 'ativa')} · Versão {baseline.versao}</p>
      <p>Justificativa: {reason.trim()}</p><p>{consequence}</p>
      <div className="form-actions"><button className="button button-secondary" onClick={() => setState('idle')}>Cancelar</button>
      <button className="button" onClick={() => void confirm()}>Confirmar alteração</button></div>
    </dialog>
  </Card>;
}
