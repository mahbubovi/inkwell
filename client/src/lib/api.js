const BASE = import.meta.env.VITE_API_URL || '/api';
const HINT = 'ink:session'; // only says "this browser probably has a session"; it holds no secret

// The short-lived access token lives in memory only (not localStorage), so injected scripts cannot read it
// from storage. The long-lived refresh token is an httpOnly cookie that JavaScript cannot see at all.
let token = null;
let onUnauthorized = () => {};

export const getToken = () => token;
export const setToken = (t) => { token = t; };
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };
export const hasSessionHint = () => { try { return localStorage.getItem(HINT) === '1'; } catch { return false; } };
export const setSessionHint = (on) => { try { on ? localStorage.setItem(HINT, '1') : localStorage.removeItem(HINT); } catch { /* ignore */ } };

export class ApiError extends Error {
  constructor(message, status, errors) { super(message); this.status = status; this.errors = errors; }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(BASE + path, { method, headers, signal, credentials: 'include', body: body && JSON.stringify(body) });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new ApiError('Can’t reach the server. Check that the API is running on port 5000.', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.message || 'Something went wrong. Try again.', res.status, data.errors);
  return data;
}

// One refresh at a time: parallel requests that all hit an expired token share the same refresh call.
let refreshing = null;
export function refreshSession() {
  refreshing ??= request('/auth/refresh', { method: 'POST' })
    .then((d) => { setToken(d.token); setSessionHint(true); return d; })
    .finally(() => { refreshing = null; });
  return refreshing;
}

const NO_RETRY = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

// Fetch wrapper: adds the access token; on 401 it silently refreshes once and retries the request.
export async function api(path, opts = {}) {
  try {
    return await request(path, opts);
  } catch (e) {
    if (e.status !== 401 || opts.silent || NO_RETRY.includes(path) || !hasSessionHint()) throw e;
    try { await refreshSession(); }
    catch { setToken(null); setSessionHint(false); onUnauthorized(); throw e; }
    return request(path, opts);
  }
}
