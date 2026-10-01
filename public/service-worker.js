// OpenTristam Service Worker
// __CACHE_VERSION__ is replaced at build time by scripts/generate-sw.mjs
const CACHE_VERSION = '__CACHE_VERSION__';
const CACHE_NAME = 'opentristam-' + CACHE_VERSION;

// Never cache MPQ files — they can be 50 MB+ and live in IndexedDB anyway.
// The engine .wasm files are content-hashed under /assets/, so they are cached
// cache-first like JS chunks: repeat launches skip a ~1.5 MB download and the
// game can actually start offline once it has been played once.
const NO_CACHE_RE = /\.mpq$/i;

const ORIGIN = self.location.origin;

// ─── Install ─────────────────────────────────────────────────────────────────
// Precache the root HTML shell so the app can open offline after first visit.

self.addEventListener('install', (event) => {
  const base = self.registration.scope; // e.g. 'https://…/OpenTristam/'
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([base, base + 'index.html']).catch(() => {
        // Non-fatal: precache skipped if network is unavailable during install.
      })
    )
  );
  // Do NOT call skipWaiting here — we wait for the user to confirm the update.
});

// ─── Activate ────────────────────────────────────────────────────────────────
// Remove any caches from previous versions.

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// ─── Fetch ───────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only intercept same-origin GET requests.
  if (request.method !== 'GET') return;
  if (url.origin !== ORIGIN) return;

  // Skip game archives: they are large and persisted in IndexedDB instead.
  if (NO_CACHE_RE.test(url.pathname)) return;

  // Hashed asset chunks (JS/CSS emitted by Vite into /assets/) never change
  // content for the same URL, so cache-first is safe and fast.
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
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    // 206 partial responses cannot be stored by the Cache API.
    if (response.ok && response.status !== 206) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (_err) {
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (_err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Return a minimal offline page for navigation requests.
    if (request.mode === 'navigate') {
      const shell = await caches.match(self.registration.scope);
      if (shell) return shell;
    }
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// ─── Messages ────────────────────────────────────────────────────────────────
// The app sends 'SKIP_WAITING' when the user has confirmed the update prompt.

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
