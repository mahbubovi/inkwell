import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from '../lib/api';
import { useToast } from './ToastContext';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken()); // true while a saved session is being checked

  useEffect(() => {
    setUnauthorizedHandler(() => { setUser(null); toast('Your session expired. Log in again.'); });
  }, [toast]);

  useEffect(() => {
    if (!getToken()) return;
    api('/auth/me', { silent: true })
      .then((d) => setUser(d.user))
      .catch((e) => { if (e.status === 401) setToken(null); })
      .finally(() => setLoading(false));
  }, []);

  const authenticate = useCallback(async (path, body) => {
    const d = await api(path, { method: 'POST', body });
    setToken(d.token);
    setUser(d.user);
    return d.user;
  }, []);

  const value = useMemo(() => ({
    user, loading,
    login: (email, password) => authenticate('/auth/login', { email, password }),
    register: (name, email, password) => authenticate('/auth/register', { name, email, password }),
    logout: () => { setToken(null); setUser(null); },
  }), [user, loading, authenticate]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
