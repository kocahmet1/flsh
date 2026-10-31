/* Sat Vocab Master service worker.
 * The two placeholders below are filled in by scripts/build-pwa.js after
 * `expo export`. If they are still placeholders (e.g. `expo start`), this
 * worker removes itself and its caches so dev builds never go stale. */
const BUILD_ID = "__BUILD_ID__";
const CORE_URLS = ["__CORE_URLS__"];
const MEDIA_URLS = ["__MEDIA_URLS__"];

const DEV = CORE_URLS.length === 1 && CORE_URLS[0] === '__CORE_URLS__';
const CACHE_PREFIX = 'svm-';
const CACHE = CACHE_PREFIX + BUILD_ID;

if (DEV) {
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX)).map((k) => caches.delete(k)));
      await self.registration.unregister();
    })());
  });
} else {
  // A redirected response can't be served for a navigation, so rebuild it clean.
  async function clean(res) {
    if (!res.redirected) return res;
    return new Response(await res.blob(), { status: 200, headers: res.headers });
  }

  function aliasesFor(url) {
    if (!url.endsWith('.html')) return [];
    const base = url.slice(0, -'.html'.length);
    if (base === '/index') return ['/'];
    if (base.endsWith('/index')) {
      const dir = base.slice(0, -'/index'.length);
      return [dir, dir + '/'];
    }
    return [base];
  }

  async function precache(cache, url, strict) {
    try {
      // Reuse a copy from a previous build's cache when we have one (hashed names don't change).
      let res = await caches.match(url);
      if (!res) {
        res = await fetch(url, { cache: 'reload' });
        if (!res.ok) throw new Error(url + ' -> ' + res.status);
      }
      res = await clean(res);
      await cache.put(url, res.clone());
      for (const alias of aliasesFor(url)) await cache.put(alias, res.clone());
    } catch (err) {
      if (strict) throw err;
    }
  }

  self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE);
      await Promise.all(CORE_URLS.map((u) => precache(cache, u, true)));
      await Promise.all(MEDIA_URLS.map((u) => precache(cache, u, false)));
      await self.skipWaiting();
    })());
  });

  self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })());
  });

  // Safari asks for audio/video with Range headers and needs a 206 back.
  async function rangeResponse(req, res) {
    const buf = await res.arrayBuffer();
    const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '');
    const len = buf.byteLength;
    let start = 0;
    let end = len - 1;
    if (m) {
      if (m[1] === '' && m[2] !== '') {
        start = Math.max(0, len - Number(m[2]));
      } else {
        start = m[1] === '' ? 0 : Number(m[1]);
        end = m[2] === '' ? len - 1 : Math.min(Number(m[2]), len - 1);
      }
    }
    if (start > end || start >= len) {
      return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + len } });
    }
    return new Response(buf.slice(start, end + 1), {
      status: 206,
      statusText: 'Partial Content',
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'application/octet-stream',
        'Content-Range': 'bytes ' + start + '-' + end + '/' + len,
        'Content-Length': String(end - start + 1),
      },
    });
  }

  async function handleNavigation(req, url) {
    try {
      const net = await Promise.race([
        fetch(req),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000)),
      ]);
      if (net && net.status < 500) return net;
    } catch (_) { /* offline or slow: fall back to the app shell */ }
    const path = url.pathname;
    return (
      (await caches.match(path, { ignoreSearch: true })) ||
      (await caches.match(path.replace(/\/+$/, '') || '/', { ignoreSearch: true })) ||
      (await caches.match('/index.html')) ||
      (await caches.match('/')) ||
      Response.error()
    );
  }

  async function handleAsset(req, url) {
    const hit = await caches.match(url.pathname + url.search);
    const ranged = req.headers.has('range');
    if (hit) return ranged ? rangeResponse(req, hit) : hit;
    try {
      const net = await fetch(req);
      if (net.ok && net.status === 200 && !ranged) {
        const cache = await caches.open(CACHE);
        cache.put(req, net.clone());
      }
      return net;
    } catch (_) {
      return Response.error();
    }
  }

  self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;
    if (url.pathname === '/sw.js') return;
    if (req.mode === 'navigate') {
      event.respondWith(handleNavigation(req, url));
    } else {
      event.respondWith(handleAsset(req, url));
    }
  });
}
