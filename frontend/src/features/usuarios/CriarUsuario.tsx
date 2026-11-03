import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ApiError } from '../../api/client';
import type { Perfil, UsuarioResumo } from '../../api/contracts';
import { useSession } from '../../app/session';
import { Card, PageHeading } from '../../shared/ui';
import { useClinicalDraft } from '../../shared/writing';
import { profiles } from './AlterarConta';

export interface CriacaoRecibo {
  operacaoId: string; usuarioId?: string; atorUsuarioId: string; instante: string;
  operacao: 'criacao'; resultado: 'aplicada' | 'login_duplicado'; nome?: string; login?: string; perfil?: Perfil;
}
interface CriacaoResposta { recibo: CriacaoRecibo; credencialTemporaria?: string; expiraEm?: string }
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export default function CriarUsuario() {
  const session = useSession();
  const [params, setParams] = useSearchParams();
  const [fields, setFields] = useClinicalDraft('usuario:criacao:campos', { nome: '', login: '', perfil: '' as Perfil | '', justificativa: '' });
  const [operation, setOperation] = useState(params.get('criacao') ?? '');
  const [state, setState] = useState<'idle' | 'review' | 'pending' | 'uncertain' | 'complete'>(operation ? 'uncertain' : 'idle');
  const [receipt, setReceipt] = useState<CriacaoRecibo>();
  const [credential, setCredential] = useState<{ value: string; expires: string }>();
  const [current, setCurrent] = useState<UsuarioResumo>();
  const [message, setMessage] = useState('');
  const [reading, setReading] = useState(false);
  const sending = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const review = useRef<HTMLButtonElement>(null);
  const feedback = useRef<HTMLDivElement>(null);
  const locked = state !== 'idle';
  useEffect(() => {
    if (state !== 'review') return;
    const node = dialog.current; node?.showModal(); node?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => { node?.close(); review.current?.focus(); };
  }, [state]);
  useEffect(() => { if (message || receipt) feedback.current?.focus(); }, [message, receipt]);
  function remember(id: string) {
    setOperation(id); setParams(previous => { const next = new URLSearchParams(previous); next.set('criacao', id); return next; }, { replace: true });
  }
  async function accept(found: CriacaoRecibo, id: string) {
    if (found.operacaoId !== id || found.operacao !== 'criacao' || !['aplicada', 'login_duplicado'].includes(found.resultado)) throw new ApiError(502);
    if (found.resultado === 'login_duplicado') { setReceipt(found); setState('idle'); setMessage('Login já utilizado. A recusa foi registrada; revise o login e prepare uma nova confirmação.'); return; }
    if (!found.usuarioId || !/^\d+$/.test(found.usuarioId)) throw new ApiError(502);
    setReceipt(found); setState('complete');
    try { setCurrent(await session.client.get<UsuarioResumo>(`/usuarios/${found.usuarioId}`)); }
    catch { setMessage('Criação confirmada pelo recibo. Não foi possível reler a conta; consulte o usuário novamente.'); }
  }
  async function confirm() {
    if (sending.current || state !== 'review') return;
    sending.current = true; setState('pending'); setMessage('');
    const id = crypto.randomUUID(); remember(id);
    try {
      const response = await session.client.request<CriacaoResposta>('/usuarios', { method: 'POST', body: {
        operacaoId: id, nome: fields.nome.trim(), login: fields.login.trim().toLowerCase(), perfil: fields.perfil,
        ...(fields.justificativa.trim() ? { justificativa: fields.justificativa.trim() } : {}),
      } });
      await accept(response.recibo, id);
      if (response.credencialTemporaria && response.expiraEm) setCredential({ value: response.credencialTemporaria, expires: response.expiraEm });
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 0;
      if (status === 400 || status === 409) {
        setState('idle');
        if (status === 400) { setOperation(''); setParams(previous => { const next = new URLSearchParams(previous); next.delete('criacao'); return next; }, { replace: true }); }
        setMessage(status === 409 ? 'Login já utilizado ou código de operação em conflito. Revise os dados antes de uma nova confirmação.' : 'Criação recusada. Revise nome completo, login e perfil. Os campos foram preservados.');
      } else {
        setState('uncertain'); setMessage(status === 403 ? 'Operação não autorizada. Consulte o resultado com um administrador autorizado, sem reenviar.' : 'Resposta não confirmada. Consulte o resultado sem repetir a criação.');
      }
    } finally { sending.current = false; }
  }
  async function verify() {
    if (!uuid.test(operation) || reading || sending.current) return;
    setReading(true); setMessage(''); remember(operation);
    try { await accept(await session.client.get<CriacaoRecibo>(`/usuarios/criacoes/${operation}`), operation); }
    catch { setMessage('Recibo ainda não disponível ou consulta não autorizada. O resultado permanece indeterminado; consulte novamente sem reenviar.'); }
    finally { setReading(false); }
  }
  return <><Link to="/usuarios">Voltar aos usuários</Link>
    <PageHeading title="Criar usuário" description="Cadastre uma conta com perfil inicial e credencial temporária para o primeiro acesso." />
    <Card><form aria-busy={state === 'pending'} onSubmit={event => { event.preventDefault(); if (!locked) { setMessage(''); setState('review'); } }}>
      <div className="form-grid">
        <div className="form-field"><label htmlFor="criar-nome">Nome completo</label><input id="criar-nome" autoComplete="off" required minLength={3} maxLength={160} value={fields.nome} disabled={locked} onChange={event => setFields({ ...fields, nome: event.target.value })} /></div>
        <div className="form-field"><label htmlFor="criar-login">Login</label><input id="criar-login" autoComplete="off" required minLength={3} maxLength={254} pattern="\S+" value={fields.login} disabled={locked} onChange={event => setFields({ ...fields, login: event.target.value })} /><p className="muted">Único, sem espaços e sem distinção entre maiúsculas e minúsculas. Não precisa ser e-mail.</p></div>
        <div className="form-field"><label htmlFor="criar-perfil">Perfil inicial</label><select id="criar-perfil" required value={fields.perfil} disabled={locked} onChange={event => setFields({ ...fields, perfil: event.target.value as Perfil })}><option value="">Selecione o perfil</option>{Object.entries(profiles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div className="form-field"><label htmlFor="criar-motivo">Justificativa (opcional)</label><textarea id="criar-motivo" maxLength={1000} value={fields.justificativa} disabled={locked} onChange={event => setFields({ ...fields, justificativa: event.target.value })} /></div>
      </div><p>A credencial será exibida uma única vez. Entregue por canal seguro fora do aplicativo. O primeiro acesso exige definir uma nova senha.</p>
      <button className="button" ref={review} disabled={locked || !fields.perfil || fields.nome.trim().length < 3 || fields.login.trim().length < 3}>Revisar criação</button>
    </form>
    <div ref={feedback} tabIndex={-1} role="status" aria-live="polite">{state === 'pending' && <p>Criando conta…</p>}{message && <p>{message}</p>}
      {receipt?.resultado === 'aplicada' && <><h2>Usuário criado</h2><p>Recibo: {receipt.operacaoId}. Ator: {receipt.atorUsuarioId}. Instante: {receipt.instante}.</p>
        <p>{receipt.nome} · {receipt.login} · {receipt.perfil ? profiles[receipt.perfil] : ''}</p><p>{current ? `Conta relida: ${current.nome}, ${current.ativo ? 'ativa' : 'inativa'}, perfil ${profiles[current.perfil]}.` : 'Consulte a conta para verificar o estado atual.'}</p>
        <Link className="button button-secondary" to={`/usuarios/${receipt.usuarioId}`}>Ver usuário criado</Link>
        {!credential && <p>A credencial não pode ser consultada novamente. Se ela não foi entregue, procure um administrador autorizado da unidade para recuperação segura.</p>}</>}
      {receipt?.resultado === 'login_duplicado' && <p>Recibo de recusa: {receipt.operacaoId}. Ator: {receipt.atorUsuarioId}. Instante: {receipt.instante}.</p>}
    </div>
    {credential && <section className="notice" aria-labelledby="credencial-unica"><h2 id="credencial-unica">Credencial temporária — exibição única</h2><p>Entregue por canal seguro e encerre esta exibição. Não salve em documentos ou capturas.</p><label htmlFor="credencial-temporaria">Credencial temporária</label><input id="credencial-temporaria" className="mono" readOnly autoComplete="off" value={credential.value} /><p>Expira em: {new Date(credential.expires).toLocaleString('pt-BR')}.</p><button className="button button-secondary" onClick={() => setCredential(undefined)}>Encerrar exibição da credencial</button></section>}
    {(state === 'uncertain' || operation) && <div className="form-field"><label htmlFor="criacao-operacao">Código da criação</label><input id="criacao-operacao" value={operation} readOnly={Boolean(params.get('criacao'))} onChange={event => setOperation(event.target.value.trim())} /><button className="button button-secondary" onClick={() => void verify()} disabled={!uuid.test(operation) || reading || state === 'pending'}>{reading ? 'Consultando…' : 'Consultar resultado da criação'}</button></div>}
    <dialog className="draft-dialog" ref={dialog} aria-labelledby="criar-review-title" onCancel={event => { event.preventDefault(); setState('idle'); }} onClick={event => { if (event.target === event.currentTarget) { const box = event.currentTarget.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) setState('idle'); } }}>
      <div className="dialog-heading"><h2 id="criar-review-title">Confirmar criação de usuário</h2><button className="button button-secondary" aria-label="Fechar revisão" onClick={() => setState('idle')}>×</button></div>
      <dl className="details-list"><div><dt>Nome completo</dt><dd>{fields.nome.trim()}</dd></div><div><dt>Login</dt><dd>{fields.login.trim().toLowerCase()}</dd></div><div><dt>Perfil inicial</dt><dd>{fields.perfil ? profiles[fields.perfil] : ''}</dd></div></dl>
      <p>A conta inicia ativa, com troca obrigatória da credencial temporária. Vínculos de pacientes e capacidades especiais não são concedidos pela criação.</p>
      {fields.justificativa.trim() && <p>Justificativa: {fields.justificativa.trim()}</p>}
      <div className="form-actions"><button className="button button-secondary" onClick={() => setState('idle')}>Cancelar</button><button className="button" onClick={() => void confirm()}>Confirmar criação</button></div>
    </dialog></Card></>;
}
