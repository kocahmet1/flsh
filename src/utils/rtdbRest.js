import { ref } from 'firebase/database';
import { auth, db } from '../firebase/config';

// Realtime Database REST calls.
//
// The Firebase SDK sends everything over one shared socket, so one large
// download delays every other read and every write confirmation behind it.
// Bulk background jobs (building deck summaries, moving old inline media)
// use the REST API instead: it runs on its own HTTP connections and never
// gets in the way of what the person is doing in the app.

const FIREBASE_HOST = /(firebaseio\.com|firebasedatabase\.app)(:\d+)?$/i;

function databaseNamespace() {
  const url = db?.app?.options?.databaseURL || '';
  const match = /^[a-z]+:\/\/([^./:]+)/i.exec(url);
  return match ? match[1] : '';
}

function buildQuery(params) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
}

/** Absolute REST URL for a database path, e.g. users/abc/decks.json?... */
export function restUrl(path, params = {}) {
  // ref().toString() gives the database origin, including when an emulator
  // is connected.
  const base = ref(db, path).toString();
  const host = /^[a-z]+:\/\/([^/]+)/i.exec(base)?.[1] || '';
  const query = { ...params };
  if (!FIREBASE_HOST.test(host)) {
    // Emulators need the namespace as a query parameter.
    query.ns = databaseNamespace();
  }
  const queryString = buildQuery(query);
  return `${base}.json${queryString ? `?${queryString}` : ''}`;
}

/**
 * Authenticated REST request as the signed-in user.
 * method: GET | PATCH | PUT | DELETE. Returns parsed JSON (null if empty).
 */
export async function restRequest(path, { method = 'GET', params = {}, body } = {}) {
  const user = auth?.currentUser;
  if (!db || !user) {
    throw new Error('Not signed in');
  }

  const token = await user.getIdToken();
  const url = restUrl(path, { ...params, auth: token });
  const response = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    let detail = '';
    try {
      detail = (await response.text()).slice(0, 200);
    } catch {
      // ignore
    }
    throw new Error(`Database ${method} ${path} failed (HTTP ${response.status}) ${detail}`.trim());
  }

  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
