import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { SessionManager, type SessionSnapshot } from './SessionManager';

interface SessionValue extends SessionSnapshot {
  client: SessionManager['client'];
  login: SessionManager['login'];
  logout: SessionManager['logout'];
  revalidate: SessionManager['revalidate'];
}
const Context = createContext<SessionValue | null>(null);

export function SessionProvider({ children, manager: supplied }: { children: ReactNode; manager?: SessionManager }) {
  const [manager] = useState(() => supplied ?? new SessionManager());
  const state = useSyncExternalStore(manager.subscribe, manager.getSnapshot, manager.getSnapshot);
  useEffect(() => {
    const resume = () => { if (document.visibilityState === 'visible') void manager.revalidate(); };
    window.addEventListener('focus', resume);
    document.addEventListener('visibilitychange', resume);
    return () => {
      window.removeEventListener('focus', resume);
      document.removeEventListener('visibilitychange', resume);
      manager.dispose();
    };
  }, [manager]);
  return <QueryClientProvider client={manager.queries}>
    <Context.Provider value={{ ...state, client: manager.client, login: manager.login,
      logout: manager.logout, revalidate: manager.revalidate }}>{children}</Context.Provider>
  </QueryClientProvider>;
}

export function useSession(): SessionValue {
  const value = useContext(Context);
  if (!value) throw new Error('SessionProvider obrigatório');
  return value;
}
