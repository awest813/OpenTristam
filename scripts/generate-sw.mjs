/**
 * Post-build script: stamps the service worker with a unique cache version.
 *
 * After `vite build` copies `public/service-worker.js` into `build/`, this
 * script reads it, replaces the `__CACHE_VERSION__` placeholder with a string
 * derived from the package version and a hash of the build asset filenames,
 * then writes the file back.  Changing the cache version on every deploy
 * ensures browsers install the new service worker and clear the old cache.
 *
 * Usage (via package.json "build" script):
 *   vite build && node scripts/generate-sw.mjs
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const rootDir = process.cwd();
const swPath = path.join(rootDir, 'build', 'service-worker.js');
const assetsDir = path.join(rootDir, 'build', 'assets');
const pkgPath = path.join(rootDir, 'package.json');

if (!existsSync(swPath)) {
  console.error('[generate-sw] service-worker.js not found in build/. Run vite build first.');
  process.exit(1);
}

// Read the app version from package.json.
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
const appVersion = pkg.version || '0.0.0';

// Compute a short hash of all asset filenames so the cache version changes
// whenever any output file changes (and only then).
let assetHash = 'dev';
if (existsSync(assetsDir)) {
  const names = readdirSync(assetsDir).sort().join(',');
  assetHash = crypto.createHash('sha256').update(names).digest('hex').slice(0, 8);
}

const cacheVersion = `${appVersion}-${assetHash}`;

const original = readFileSync(swPath, 'utf-8');

// Every hashed build file (for pruning stale entries) and the subset needed to
// open the app offline: code and styles. Engine .wasm (~1.5 MB each) and other
// large binaries are cached on first use instead of on every install.
const buildAssets = existsSync(assetsDir)
  ? readdirSync(assetsDir)
      .filter((name) => !name.endsWith('.map'))
      .sort()
      .map((name) => `assets/${name}`)
  : [];
const precacheAssets = buildAssets.filter((path) => /\.(js|css)$/.test(path));

// Match the declarations themselves (whitespace-tolerant, since Prettier may
// reflow them) rather than bare tokens that could also appear in comments.
const replacements = [
  [
    /const CACHE_VERSION = '__CACHE_VERSION__';/,
    `const CACHE_VERSION = ${JSON.stringify(cacheVersion)};`,
  ],
  [
    /const PRECACHE_ASSETS = \[\s*\/\* __PRECACHE_ASSETS__ \*\/\s*\];/,
    `const PRECACHE_ASSETS = ${JSON.stringify(precacheAssets)};`,
  ],
  [
    /const BUILD_ASSETS = \[\s*\/\* __BUILD_ASSETS__ \*\/\s*\];/,
    `const BUILD_ASSETS = ${JSON.stringify(buildAssets)};`,
  ],
];
let stamped = original;
for (const [pattern, value] of replacements) {
  if (!pattern.test(stamped)) {
    // A worker that silently keeps a placeholder ships a broken offline cache.
    console.error(`[generate-sw] Placeholder ${pattern} not found in service-worker.js.`);
    process.exit(1);
  }
  stamped = stamped.replace(pattern, () => value);
}
writeFileSync(swPath, stamped, 'utf-8');

console.log(
  `[generate-sw] Service worker stamped: opentristam-${cacheVersion} ` +
    `(${precacheAssets.length} precached of ${buildAssets.length} assets)`
);
