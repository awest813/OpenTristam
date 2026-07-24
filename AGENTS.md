# AGENTS.md

## Cursor Cloud specific instructions

### What this repo is

OpenTristam is a single, purely client-side static web app: the reverse-engineered Diablo 1 engine compiled to WebAssembly, wrapped in a React (Vite) shell. There is no backend, database, or container. Standard commands live in `README.md`, `CONTRIBUTING.md`, and `package.json` `scripts` — use those; only the non-obvious caveats below are documented here.

### Running / commands

- Dependencies are installed by the startup update script (`npm ci --legacy-peer-deps`); the `--legacy-peer-deps` flag is required because of `peerjs@1.4.7` peer ranges.
- Dev server: `npm start`. It serves at `http://localhost:5173/OpenTristam/` — note the `/OpenTristam/` base path (hardcoded in `vite.config.js` for GitHub Pages), NOT the root `/`.
- Lint / test / build: `npm run lint`, `npm test -- --watchAll=false`, `npm run build` (then `npm run check:bundle-budget`). These match CI (`.github/workflows/ci.yml`, Node 22).

### Non-obvious gotchas

- The start screen's "Play Shareware" auto-download does NOT work in local dev. `src/api/load_spawn.js` fetches `process.env.PUBLIC_URL + '/spawn.mpq'`, and `PUBLIC_URL` is `''` in dev (see the `define` block in `vite.config.js`), so it requests `/spawn.mpq` at the origin root and 404s (the app itself lives under `/OpenTristam/`).
- To actually boot the game in dev, use the "Select MPQ" button and pick a shareware `spawn.mpq` file. A file literally named `spawn.mpq` is treated as shareware (`retail=false`) in `src/engine/session.js`, and this path passes the file directly to the worker, bypassing the broken fetch. Valid `spawn.mpq` sizes are `25830791` or `50274091` bytes (see `SpawnSizes`). The file is gitignored (`public/spawn.mpq`); one known source is `https://d07riv.github.io/diabloweb/spawn.mpq`. Retail play uses a user-supplied `DIABDAT.MPQ` the same way.
- A red "Save storage unavailable" notice appears in dev. `idb-kv-store` imports the Node `events` module, which Vite externalizes for the browser, so IndexedDB init throws and saves won't persist. This is non-blocking — gameplay (rendering, input, character creation, entering Tristram) works fine.
- E2E/visual tests (`npm run test:e2e`, `npm run test:visual`) use Playwright, which auto-builds and serves a preview on `127.0.0.1:4173`; they require Playwright's Chromium (`npx playwright install chromium`), not installed by the update script. `npm run smoke:retail` needs a local Chrome plus a retail MPQ.
