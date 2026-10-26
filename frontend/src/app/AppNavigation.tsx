import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import type { AuthUser } from '../api/contracts';

/** A disclosure on small screens; normal sidebar navigation on desktop. */
export function AppNavigation({ user, logout }: { user: AuthUser; logout: () => void }) {
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
  const toggle = useRef<HTMLButtonElement>(null);
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => { setExpanded(false); }, [location.key]);
  useEffect(() => {
    const media = window.matchMedia?.('(max-width: 800px)');
    if (!media) return;
    // A browser may blur a control as soon as CSS hides it, before notifying
    // matchMedia listeners. Remember the last actual focus to recover it then.
    let lastFocused = document.activeElement;
    const rememberFocus = () => { lastFocused = document.activeElement; };
    const resize = (event: MediaQueryListEvent) => {
      const focused = document.activeElement === document.body ? lastFocused : document.activeElement;
      setExpanded(false);
      if (event.matches && content.current?.contains(focused)) toggle.current?.focus();
      if (!event.matches && focused === toggle.current) document.getElementById('conteudo')?.focus();
    };
    document.addEventListener('focusin', rememberFocus);
    media.addEventListener('change', resize);
    return () => {
      document.removeEventListener('focusin', rememberFocus);
      media.removeEventListener('change', resize);
    };
  }, []);
  return <aside className="sidebar" onKeyDown={event => {
    if (event.key === 'Escape' && expanded) {
      event.preventDefault();
      setExpanded(false);
      toggle.current?.focus();
    }
  }}>
    <div className="sidebar-header">
      <Link to="/" className="brand" aria-label="Ambulatório Santa Casa, início">
        <span className="brand-mark" aria-hidden="true">+</span>
        <span>Ambulatório<strong>Santa Casa</strong></span>
      </Link>
      <button ref={toggle} type="button" className="button button-secondary navigation-toggle"
        aria-controls={contentId} aria-expanded={expanded} aria-label={expanded ? 'Fechar menu' : 'Menu'}
        onClick={() => setExpanded(value => !value)}>
        <span aria-hidden="true">{expanded ? '×' : '☰'}</span> {expanded ? 'Fechar' : 'Menu'}
      </button>
    </div>
    <div id={contentId} ref={content} className="sidebar-content" data-expanded={expanded}>
      <nav aria-label="Menu principal">
        <NavLink to="/" end><span aria-hidden="true">⌂</span> Início</NavLink>
        <NavLink to="/pacientes"><span aria-hidden="true">◎</span> Pacientes</NavLink>
        <NavLink to="/importacoes"><span aria-hidden="true">▤</span> Importações</NavLink>
        <NavLink to="/minha-conta"><span aria-hidden="true">○</span> Minha conta</NavLink>
      </nav>
      <div className="sidebar-account"><span className="muted">{user.nome}</span>
        <button className="button button-secondary" onClick={logout}>Sair</button></div>
    </div>
  </aside>;
}
