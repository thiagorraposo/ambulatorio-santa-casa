import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router';
import { ApiError, isAbort } from '../api/client';
import { useSession } from './session';
import { Card, PageHeading, ApiErrorState } from '../shared/ui';
import PatientsPage from '../features/pacientes/PatientsPage';
import PatientPage from '../features/pacientes/PatientPage';
import AttendancePage from '../features/pacientes/AttendancePage';
import PatientFormPage from '../features/clinical/PatientFormPage';
import AttendanceFormPage from '../features/clinical/AttendanceFormPage';
import FollowupPage from '../features/clinical/FollowupPage';
import { DraftProvider } from '../shared/writing';
import { AppNavigation } from './AppNavigation';
import { ImportacaoDetalhePage, ImportacoesPage } from '../features/importacoes/ImportacoesPage';

const profiles = { consulta: 'Consulta', edicao: 'Edição', administracao: 'Administração' };

export function returnDestination(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  const url = new URL(value, 'http://app.local');
  if (url.origin !== 'http://app.local' || url.pathname === '/login') return '/';
  return `${url.pathname}${url.search}${url.hash}`;
}

function RouteEffects() {
  const location = useLocation();
  useEffect(() => {
    const name = location.pathname === '/login' ? 'Entrar' : location.pathname.startsWith('/pacientes')
      ? 'Pacientes' : location.pathname.startsWith('/importacoes') ? 'Importações'
      : location.pathname === '/minha-conta' ? 'Minha conta' : 'Início';
    document.title = `${name} | Ambulatório Santa Casa`;
    if (location.pathname !== '/login') document.querySelector<HTMLElement>('#conteudo')?.focus();
  }, [location.key, location.pathname]);
  return null;
}

function LoginPage() {
  const session = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const destination = returnDestination(params.get('next'));
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const busy = session.status === 'authenticating';
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  if (session.status === 'authenticated') return <Navigate to={destination} replace />;
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setError(null);
    try {
      await session.login(login.trim(), password);
      setPassword('');
      navigate(destination, { replace: true });
    } catch (failure) {
      if (isAbort(failure)) return;
      setError(failure instanceof ApiError && failure.status === 401
        ? 'Usuário ou senha não conferem.' : failure instanceof ApiError ? failure.message : new ApiError(0).message);
    }
  };
  return <main className="login-page" id="conteudo" tabIndex={-1}>
    <div className="login-brand"><span className="brand-mark" aria-hidden="true">+</span>
      <p>Ambulatório <strong>Santa Casa</strong></p></div>
    <Card className="login-card">
      <PageHeading title="Entre na sua conta" description="Consulte os registros do ambulatório com seu acesso institucional." />
      {session.reason && session.reason !== 'signed_out' && <p className="notice" role="status">
        Sua sessão terminou. Entre novamente para continuar.</p>}
      {error && <div className="error-state" role="alert" ref={errorRef} tabIndex={-1}>{error}</div>}
      <form onSubmit={(event) => { void submit(event); }} aria-busy={busy}>
        <div className="form-field"><label htmlFor="usuario">Usuário</label>
          <input id="usuario" name="usuario" autoComplete="username" required minLength={3} maxLength={254}
            pattern="\S+" value={login} onChange={(event) => setLogin(event.target.value)} autoFocus
            disabled={busy} /></div>
        <div className="form-field"><label htmlFor="senha">Senha</label>
          <input id="senha" name="senha" type="password" autoComplete="current-password" required
            minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)}
            disabled={busy} /></div>
        <button type="submit" className="button" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
        {busy && <p role="status">Verificando seu acesso…</p>}
      </form>
    </Card>
    <p className="login-footer">Acesso aos registros conforme suas permissões.</p>
  </main>;
}

function Layout({ children }: { children: ReactNode }) {
  const session = useSession();
  const user = session.user!;
  return <div className="app-layout">
    <a className="skip-link" href="#conteudo">Ir para o conteúdo</a>
    <AppNavigation user={user} logout={session.logout} />
    <div className="workspace">
      <header className="topbar"><span className="topbar-service">Ambulatório Santa Casa</span>
        <div className="topbar-identity"><span>{user.nome}</span>
          <span className="badge">{profiles[user.perfil]}</span></div></header>
      <main id="conteudo" className="page-content" tabIndex={-1}>{children}</main>
      <footer className="app-footer">Ambulatório Santa Casa</footer>
    </div>
  </div>;
}

function ProtectedLayout() {
  const session = useSession();
  const location = useLocation();
  if (session.status !== 'authenticated' || !session.user) {
    const next = encodeURIComponent(`${location.pathname}${location.search}${location.hash}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <DraftProvider key={session.draftScope}><Layout>{session.identityError
    ? <IdentityUnavailable /> : <Outlet />}</Layout></DraftProvider>;
}

function IdentityUnavailable() {
  const session = useSession();
  const heading = useRef<HTMLDivElement>(null);
  useEffect(() => {
    heading.current?.focus();
    const content = heading.current?.closest('main');
    return () => { if (content?.isConnected) content.focus(); };
  }, []);
  return <div ref={heading} tabIndex={-1}>
    <PageHeading title="Não foi possível verificar seu acesso" description="Tente verificar novamente para continuar de onde parou, ou saia da conta." />
    <ApiErrorState error={session.identityError} retry={() => { void session.revalidate(); }} />
    <button className="button button-secondary" onClick={session.logout}>Sair da conta</button>
  </div>;
}

function HomePage() {
  return <>
    <PageHeading title="Início" description="Encontre um paciente e consulte os registros disponíveis para seu acesso." />
    <div className="home-grid">
      <Card><span className="section-label">REGISTROS DO AMBULATÓRIO</span>
        <h2>Consulte a ficha do paciente</h2>
        <p>Busque por nome ou sexo para abrir dados pessoais, atendimentos e acompanhamento.</p>
        <Link to="/pacientes" className="button">Consultar pacientes <span aria-hidden="true">→</span></Link>
      </Card>
      <Card><span className="section-label">SEU ACESSO</span><h2>Minha conta</h2>
        <p>Confira sua identificação e o perfil de acesso informado pelo serviço.</p>
        <Link to="/minha-conta" className="button button-secondary">Ver minha conta</Link>
      </Card>
    </div>
  </>;
}

function AccountPage() {
  const session = useSession();
  const user = session.user!;
  return <><PageHeading title="Minha conta" description="Confira sua identificação e seu perfil de acesso." />
    <Card><dl className="record-grid"><div><dt>Nome</dt><dd>{user.nome}</dd></div>
      <div><dt>ID do usuário</dt><dd className="mono">{user.usuarioId}</dd></div>
      <div><dt>Perfil</dt><dd>{profiles[user.perfil]}</dd></div></dl>
      <p className="muted">Para solicitar alterações no seu acesso, procure a equipe responsável pelo sistema.</p>
      <button className="button button-secondary" onClick={session.logout}>Sair da conta</button>
    </Card></>;
}

function NotFoundPage() {
  return <Card><PageHeading title="Página não disponível" description="Verifique o endereço ou escolha um destino para continuar." />
    <div className="form-actions"><Link to="/" className="button">Ir para o início</Link>
      <Link to="/pacientes" className="button button-secondary">Consultar pacientes</Link></div></Card>;
}

export default function App() {
  return <><RouteEffects /><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<ProtectedLayout />}>
      <Route index element={<HomePage />} />
      <Route path="/pacientes" element={<PatientsPage />} />
      <Route path="/pacientes/novo" element={<PatientFormPage />} />
      <Route path="/pacientes/:pacienteId/editar" element={<PatientFormPage />} />
      <Route path="/pacientes/:pacienteId/registrar" element={<FollowupPage />} />
      <Route path="/pacientes/:pacienteId/atendimentos/novo" element={<AttendanceFormPage />} />
      <Route path="/pacientes/:pacienteId/atendimentos/:atendimentoId/editar" element={<AttendanceFormPage />} />
      <Route path="/pacientes/:pacienteId" element={<PatientPage />} />
      <Route path="/pacientes/:pacienteId/atendimentos/:atendimentoId" element={<AttendancePage />} />
      <Route path="/importacoes" element={<ImportacoesPage />} />
      <Route path="/importacoes/lotes/:loteId" element={<ImportacaoDetalhePage />} />
      <Route path="/minha-conta" element={<AccountPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes></>;
}
