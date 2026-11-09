const BASE = import.meta.env.VITE_API_URL || '/api';
const KEY = 'ink:token';

let token = null;
try { token = localStorage.getItem(KEY); } catch { /* storage unavailable */ }
let onUnauthorized = () => {};

export const getToken = () => token;
export const setToken = (t) => {
  token = t;
  try { t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY); } catch { /* ignore */ }
};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

export class ApiError extends Error {
  constructor(message, status, errors) { super(message); this.status = status; this.errors = errors; }
}

// Small fetch wrapper: JSON in/out, adds the JWT, and throws ApiError with field errors.
export async function api(path, { method = 'GET', body, signal, silent } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(BASE + path, { method, headers, signal, body: body && JSON.stringify(body) });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new ApiError('Can’t reach the server. Check that the API is running on port 5000.', 0);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token && !silent && !path.startsWith('/auth/login')) {
      setToken(null);
      onUnauthorized();
    }
    throw new ApiError(data.message || 'Something went wrong. Try again.', res.status, data.errors);
  }
  return data;
}
