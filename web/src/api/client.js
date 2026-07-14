// In dev, default to the local API on :4000. In production (e.g. Vercel), the
// API is served from the same origin, so default to a relative base ("").
// An explicit VITE_API_URL always wins (used for a split web/API deployment).
const DEFAULT_BASE = import.meta.env.DEV ? 'http://localhost:4000' : '';
const API_BASE = (import.meta.env.VITE_API_URL ?? DEFAULT_BASE).replace(/\/$/, '');

const TOKEN_KEY = 'ajaia_docs_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/**
 * Thin fetch wrapper: injects the bearer token, serializes JSON, and turns
 * non-2xx responses into ApiError with the server's message.
 */
async function request(path, { method = 'GET', body, isForm = false, auth = true } = {}) {
  const headers = {};
  const token = tokenStore.get();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (isForm) {
    payload = body; // FormData; let the browser set the boundary header.
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, { method, headers, body: payload });

  if (res.status === 204) return null;

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, data?.error || `Request failed (${res.status})`, data?.details);
  }
  return data;
}

export const api = {
  // auth
  login: (email, password) =>
    request('/api/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  register: (name, email, password) =>
    request('/api/auth/register', { method: 'POST', body: { name, email, password }, auth: false }),
  me: () => request('/api/auth/me'),

  // documents
  listDocuments: () => request('/api/documents'),
  getDocument: (id) => request(`/api/documents/${id}`),
  createDocument: (body = {}) => request('/api/documents', { method: 'POST', body }),
  updateDocument: (id, body) => request(`/api/documents/${id}`, { method: 'PATCH', body }),
  deleteDocument: (id) => request(`/api/documents/${id}`, { method: 'DELETE' }),
  importDocument: (file) => {
    const form = new FormData();
    form.append('file', file);
    return request('/api/documents/import', { method: 'POST', body: form, isForm: true });
  },

  // sharing
  listShares: (id) => request(`/api/documents/${id}/shares`),
  addShare: (id, email, role) =>
    request(`/api/documents/${id}/shares`, { method: 'POST', body: { email, role } }),
  removeShare: (id, userId) =>
    request(`/api/documents/${id}/shares/${userId}`, { method: 'DELETE' }),
};

export default api;
