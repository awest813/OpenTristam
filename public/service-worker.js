// OpenTristam Service Worker
//
// scripts/generate-sw.mjs stamps the three constants below at build time:
// - CACHE_VERSION changes on every build so browsers pick up the new worker.
// - PRECACHE_ASSETS lists the hashed JS/CSS the app needs to open offline.
// - BUILD_ASSETS lists every hashed file in build/assets (used for pruning).
const CACHE_VERSION = '__CACHE_VERSION__';
const PRECACHE_ASSETS = [
  /* __PRECACHE_ASSETS__ */
];
const BUILD_ASSETS = [
  /* __BUILD_ASSETS__ */
];

// HTML, manifest and icons: versioned, refreshed network-first.
const SHELL_CACHE = 'opentristam-shell-' + CACHE_VERSION;
// Content-hashed files under assets/ never change for a given URL, so they live
// in one long-lived cache shared across versions. Unchanged chunks and the
// ~1.5 MB engine .wasm are not re-downloaded after every deploy.
const ASSET_CACHE = 'opentristam-assets';
const SHELL_FILES = [
  '',
  'index.html',
  'storage.html',
  'manifest.json',
  'favicon.ico',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
];
// Assets of the build that was active before this one, so tabs still running
// the previous version can finish lazy-loading their chunks.
const PREVIOUS_ASSETS_KEY = '__previous-build-assets__';

// Never cache MPQ files — they are tens of MB and live in IndexedDB anyway.
const NO_CACHE_RE = /\.mpq$/i;
// Fall back to the cached shell if a navigation hasn't answered by then.
const NAVIGATION_TIMEOUT_MS = 4000;

const ORIGIN = self.location.origin;

// ─── Install ─────────────────────────────────────────────────────────────────
// Precache the shell and the app code. If this fails the worker does not
// install, so the app never claims to work offline when it can't.

self.addEventListener('install', (event) => {
  const base = self.registration.scope; // e.g. 'https://…/OpenTristam/'
  event.waitUntil(
    (async () => {
      const shell = await caches.open(SHELL_CACHE);
      // Bypass the HTTP cache: a stale index.html (Pages sends max-age=600)
      // would point at chunks this build doesn't precache.
      await shell.addAll(SHELL_FILES.map((file) => new Request(base + file, { cache: 'reload' })));

      const assets = await caches.open(ASSET_CACHE);
      const urls = PRECACHE_ASSETS.map((path) => base + path);
      // Skip files an earlier version already cached (hashed URLs never change).
      const cached = await Promise.all(urls.map((url) => assets.match(url, { ignoreVary: true })));
      await assets.addAll(urls.filter((_url, i) => !cached[i]));
    })()
  );
  // Do NOT call skipWaiting here — we wait for the user to confirm the update.
});

// ─── Activate ────────────────────────────────────────────────────────────────
// Remove caches from previous versions and prune hashed assets that neither
// this build nor the previous one uses.

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (key) => key.startsWith('opentristam-') && key !== SHELL_CACHE && key !== ASSET_CACHE
          )
          .map((key) => caches.delete(key))
      );
      await pruneAssets();
      await self.clients.claim();
    })()
  );
});

async function pruneAssets() {
  if (BUILD_ASSETS.length === 0) {
    return; // Unstamped worker (e.g. a dev build): nothing to compare against.
  }
  const base = self.registration.scope;
  const cache = await caches.open(ASSET_CACHE);
  const previousResponse = await cache.match(base + PREVIOUS_ASSETS_KEY);
  let previous = [];
  try {
    previous = previousResponse ? await previousResponse.json() : [];
  } catch (_err) {
    previous = [];
  }
  const keep = new Set([...BUILD_ASSETS, ...previous].map((path) => base + path));
  keep.add(base + PREVIOUS_ASSETS_KEY);
  const stale = (await cache.keys()).filter((request) => !keep.has(request.url));
  await Promise.all(stale.map((request) => cache.delete(request)));
  await cache.put(
    base + PREVIOUS_ASSETS_KEY,
    new Response(JSON.stringify(BUILD_ASSETS), {
      headers: { 'Content-Type': 'application/json' },
    })
  );
}

// ─── Fetch ───────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only intercept same-origin GET requests.
  if (request.method !== 'GET') return;
  if (url.origin !== ORIGIN) return;

  // Skip game archives: they are large and persisted in IndexedDB instead.
  if (NO_CACHE_RE.test(url.pathname)) return;

  // Source maps are only fetched for crash reports; don't keep them.
  if (url.pathname.endsWith('.map')) return;

  // Hashed asset chunks (JS/CSS/WASM emitted by Vite into /assets/) never
  // change content for the same URL, so cache-first is safe and fast.
  if (url.pathname.includes('/assets/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Everything else (HTML, manifests, icons) uses network-first so users
  // always get the latest shell, with a graceful offline fallback.
  event.respondWith(networkFirst(request));
});

// ─── Strategies ──────────────────────────────────────────────────────────────

async function cacheFirst(request) {
  // Hashed URLs identify their content, so ignore Vary: the page requests
  // module scripts with an Origin header that the precache request lacked.
  const cached = await caches.match(request, { ignoreVary: true });
  if (cached) return cached;
  try {
    const response = await fetch(request);
    // 206 partial responses cannot be stored by the Cache API.
    if (response.ok && response.status !== 206) {
      const cache = await caches.open(ASSET_CACHE);
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (_err) {
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function cachedFallback(request) {
  const cached = await caches.match(request, {
    ignoreSearch: request.mode === 'navigate',
    ignoreVary: true,
  });
  if (cached) return cached;
  // Any navigation inside the app can be served by the shell.
  if (request.mode === 'navigate') {
    const shell = await caches.match(self.registration.scope, { ignoreVary: true });
    if (shell) return shell;
  }
  return null;
}

async function networkFirst(request) {
  const network = fetch(request).then(async (response) => {
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  });
  // The timeout or cache may answer first; don't leave a stray rejection.
  network.catch(() => {});

  if (request.mode === 'navigate') {
    // On a stalled connection ("lie-fi"), don't leave the player staring at a
    // blank page: serve the cached shell after a short wait.
    const timeout = new Promise((resolve) => setTimeout(resolve, NAVIGATION_TIMEOUT_MS, null));
    try {
      const first = await Promise.race([network, timeout]);
      if (first) return first;
      const cached = await cachedFallback(request);
      if (cached) return cached;
      return await network;
    } catch (_err) {
      // Network failed outright; fall through to the cache.
    }
  } else {
    try {
      return await network;
    } catch (_err) {
      // Fall through to the cache.
    }
  }

  const cached = await cachedFallback(request);
  if (cached) return cached;
  return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
}

// ─── Messages ────────────────────────────────────────────────────────────────
// The app sends 'SKIP_WAITING' when the user has confirmed the update prompt.

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
