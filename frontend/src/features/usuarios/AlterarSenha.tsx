import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import { useSession } from '../../app/session';
import { Card, PageHeading } from '../../shared/ui';

export default function AlterarSenha({ obrigatoria = false }: { obrigatoria?: boolean }) {
  const session = useSession();
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [message, setMessage] = useState('');
  const [complete, setComplete] = useState(false);
  const sending = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);
  useEffect(() => { if (message) feedback.current?.focus(); }, [message]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (sending.current || uncertain || complete) return;
    if (password !== confirmation) { setMessage('A confirmação deve ser igual à nova senha.'); return; }
    if (current === password) { setMessage('Escolha uma nova senha diferente da credencial atual.'); return; }
    sending.current = true; setBusy(true); setMessage('');
    try {
      const result = await session.client.request<{ alterada: true }>('/auth/senha', { method: 'POST', body: { senhaAtual: current, novaSenha: password } });
      if (result.alterada !== true) throw new ApiError(502);
      setCurrent(''); setPassword(''); setConfirmation(''); setComplete(true);
      setMessage('Senha alterada. Entre novamente com sua nova senha para continuar.');
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 0;
      setCurrent(''); setPassword(''); setConfirmation('');
      if (status === 400 || status === 403) setMessage('Não foi possível alterar a senha. Verifique a credencial atual e os requisitos da nova senha.');
      else {
        setUncertain(true); setMessage('Não foi possível confirmar a troca. Encerre a sessão e tente entrar com a nova senha. Se necessário, procure um administrador autorizado da unidade. Não repita a solicitação para descobrir o resultado.');
      }
    } finally { setBusy(false); sending.current = false; }
  }
  return <Card>{obrigatoria ? <PageHeading title="Defina sua nova senha" description="Para continuar, substitua sua credencial temporária por uma senha pessoal." /> : <><h2>Alterar senha</h2><p>Verifique a senha atual para definir uma nova senha pessoal.</p></>}
    <p>Use de 12 a 72 caracteres, incluindo letras maiúsculas, minúsculas, números e símbolos. As sessões anteriores serão encerradas.</p>
    {message && <div role="status" ref={feedback} tabIndex={-1} className="notice">{message}</div>}
    {!complete && !uncertain && <form onSubmit={event => { void submit(event); }} aria-busy={busy}>
      <div className="form-field"><label htmlFor="senha-atual">{obrigatoria ? 'Credencial temporária' : 'Senha atual'}</label><input id="senha-atual" type="password" autoComplete="current-password" required maxLength={128} value={current} disabled={busy} onChange={event => setCurrent(event.target.value)} /></div>
      <div className="form-field"><label htmlFor="nova-senha">Nova senha</label><input id="nova-senha" type="password" autoComplete="new-password" required minLength={12} maxLength={72} value={password} disabled={busy} onChange={event => setPassword(event.target.value)} /></div>
      <div className="form-field"><label htmlFor="confirmar-senha">Confirme a nova senha</label><input id="confirmar-senha" type="password" autoComplete="new-password" required minLength={12} maxLength={72} value={confirmation} disabled={busy} onChange={event => setConfirmation(event.target.value)} /></div>
      <button className="button" disabled={busy}>{busy ? 'Alterando senha…' : 'Confirmar nova senha'}</button>
    </form>}
    {(complete || uncertain || obrigatoria) && <button className="button button-secondary" disabled={busy} onClick={session.logout}>{complete ? 'Entrar com a nova senha' : 'Sair da conta'}</button>}
    {obrigatoria && <p className="muted">Procure um administrador autorizado da unidade</p>}
  </Card>;
}
