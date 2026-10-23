// Pure helpers for Realtime Database URLs (kept apart so they can be tested
// without initialising Firebase).

const FIREBASE_HOST = /(firebaseio\.com|firebasedatabase\.app)(:\d+)?$/i;

/** True for production database hosts (as opposed to an emulator). */
export function isFirebaseHost(host) {
  return FIREBASE_HOST.test(String(host || ''));
}

/**
 * Database namespace from a databaseURL:
 *   https://my-db.firebaseio.com               -> my-db
 *   https://my-db.europe-west1.firebasedatabase.app -> my-db
 *   http://127.0.0.1:9000/?ns=my-db            -> my-db (emulator style)
 */
export function namespaceFromDatabaseUrl(url) {
  const text = String(url || '');
  const nsParam = /[?&]ns=([^&#]+)/.exec(text);
  if (nsParam) return decodeURIComponent(nsParam[1]);
  const host = /^[a-z]+:\/\/([^/?#]+)/i.exec(text)?.[1] || '';
  if (!isFirebaseHost(host)) return '';
  return host.split('.')[0];
}

/** Query string from an object, skipping null/undefined values. */
export function buildQuery(params) {
  return Object.entries(params || {})
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
}
