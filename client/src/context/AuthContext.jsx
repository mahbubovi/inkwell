import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, hasSessionHint, refreshSession, setSessionHint, setToken, setUnauthorizedHandler } from '../lib/api';
import { useToast } from './ToastContext';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

// Keeps open tabs in sync: logging out (or in) in one tab updates the others.
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('ink-auth') : null;

export function AuthProvider({ children }) {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(hasSessionHint()); // true while the saved session is being restored

  const clearSession = useCallback(() => {
    setToken(null); setSessionHint(false); setUser(null);
    channel?.postMessage('logout');
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => { setUser(null); toast('Your session expired. Log in again.'); });
  }, [toast]);

  // On load, ask the server for a fresh access token using the refresh cookie.
  useEffect(() => {
    if (!hasSessionHint()) return;
    refreshSession().then((d) => setUser(d.user)).catch(() => setSessionHint(false)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!channel) return;
    const onMessage = (e) => {
      if (e.data === 'logout') { setToken(null); setSessionHint(false); setUser(null); }
      if (e.data === 'login') refreshSession().then((d) => setUser(d.user)).catch(() => {});
    };
    channel.addEventListener('message', onMessage);
    return () => channel.removeEventListener('message', onMessage);
  }, []);

  const authenticate = useCallback(async (path, body) => {
    const d = await api(path, { method: 'POST', body });
    setToken(d.token); setSessionHint(true); setUser(d.user);
    channel?.postMessage('login');
    return d.user;
  }, []);

  const value = useMemo(() => ({
    user, loading, setUser, clearSession,
    login: (email, password) => authenticate('/auth/login', { email, password }),
    register: (name, email, password) => authenticate('/auth/register', { name, email, password }),
    logout: async () => { try { await api('/auth/logout', { method: 'POST' }); } catch { /* clear locally anyway */ } clearSession(); },
  }), [user, loading, authenticate, clearSession]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
