import { ref } from 'firebase/database';
import { auth, db } from '../firebase/config';
import { buildQuery, isFirebaseHost, namespaceFromDatabaseUrl } from './rtdbUrl';

// Realtime Database REST calls.
//
// The Firebase SDK sends everything over one shared socket, so one large
// download delays every other read and every write confirmation behind it.
// Bulk background jobs (building deck summaries, moving old inline media)
// use the REST API instead: it runs on its own HTTP connections and never
// gets in the way of what the person is doing in the app.

/** Absolute REST URL for a database path, e.g. users/abc/decks.json?... */
export function restUrl(path, params = {}) {
  // ref().toString() gives the database origin, including when an emulator
  // is connected.
  const base = ref(db, path).toString();
  const host = /^[a-z]+:\/\/([^/]+)/i.exec(base)?.[1] || '';
  const query = { ...params };
  if (!isFirebaseHost(host)) {
    // Emulators need the namespace as a query parameter.
    query.ns = namespaceFromDatabaseUrl(db?.app?.options?.databaseURL);
  }
  const queryString = buildQuery(query);
  return `${base}.json${queryString ? `?${queryString}` : ''}`;
}

/**
 * Authenticated REST request as the signed-in user.
 * method: GET | PATCH | PUT | DELETE. Returns parsed JSON (null if empty),
 * or { data, bytes } when withSize is set.
 */
export async function restRequest(path, { method = 'GET', params = {}, body, withSize = false } = {}) {
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

  const text = response.status === 204 ? '' : await response.text();
  const data = text ? JSON.parse(text) : null;
  return withSize ? { data, bytes: text.length } : data;
}
