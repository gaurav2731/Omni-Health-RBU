// API client for the OmniHealth backend (backend/index.js).
// The app previously stored all data in localStorage and never called the
// backend — every function below now goes through the real REST API.

// API base resolution order:
// 1. window.__API_BASE__ — test/DI hook (jest sets this)
// 2. __OMNI_API_BASE__ — build-time constant injected by Vite's `define`
//    (see vite.config.js) from the VITE_API_BASE env var. Optional — for
//    pointing prod at an external backend URL if ever needed.
// 3. '/api' — same-origin default: on Vercel the Express backend runs as the
//    /api/* serverless function; in local dev the Vite proxy forwards /api
//    to http://localhost:3001 (see vite.config.js server.proxy).
const ENV_API_BASE = typeof __OMNI_API_BASE__ !== 'undefined' ? __OMNI_API_BASE__ : '';
const API_BASE = (typeof window !== 'undefined' && window.__API_BASE__) || ENV_API_BASE || '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null;

  let body = null;
  try {
    body = await res.json();
  } catch {
    // Non-JSON response body; body stays null and status drives the error below.
  }

  if (!res.ok) {
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return body;
}

export async function fetchHospitalsList() {
  const list = await request('/hospitals');
  return Array.isArray(list) ? list : [];
}

export async function searchHospitalsAPI({ disease, city, state, budgetMax } = {}) {
  const qs = new URLSearchParams();
  if (disease) qs.set('disease', disease);
  if (city) qs.set('city', city);
  if (state) qs.set('state', state);
  if (budgetMax) qs.set('budget_max', String(budgetMax));
  const query = qs.toString();
  const list = await request(`/hospitals/search${query ? `?${query}` : ''}`);
  return Array.isArray(list) ? list : [];
}

export async function searchNL(query) {
  return request('/search/nl', { method: 'POST', body: JSON.stringify({ query }) });
}

// Ask the backend whether a query is medical (illness / transplant /
// checkup / injury / emergency) or not. Non-medical queries must never
// show a hospital list.
export async function classifyQueryAPI(query) {
  return request('/search/classify', { method: 'POST', body: JSON.stringify({ query }) });
}

export async function addHospitalRecord(hospitalData) {
  return request('/hospitals', { method: 'POST', body: JSON.stringify(hospitalData) });
}

export async function updateHospitalRecord(id, updatedFields) {
  return request(`/hospitals/${id}`, { method: 'PUT', body: JSON.stringify(updatedFields) });
}

export async function deleteHospitalRecord(id) {
  return request(`/hospitals/${id}`, { method: 'DELETE' });
}
