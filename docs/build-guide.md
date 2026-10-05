# OpenTristam Build Guide

This guide covers everything you need to develop, test, and build OpenTristam locally — from a first-time clone through production deployment.

---

## Contents

- [Prerequisites](#prerequisites)
- [Cloning the Repository](#cloning-the-repository)
- [Installing Dependencies](#installing-dependencies)
- [Development Server](#development-server)
- [Running Tests](#running-tests)
- [Linting](#linting)
- [Production Build](#production-build)
- [Deploying to GitHub Pages](#deploying-to-github-pages)
- [Self-Hosted Multiplayer Relay](#self-hosted-multiplayer-relay)
- [Rebuilding the WebAssembly Modules](#rebuilding-the-webassembly-modules)
- [Environment Variables](#environment-variables)
- [Common Issues](#common-issues)

---

## Prerequisites

| Tool        | Required version           | Notes                                  |
| ----------- | -------------------------- | -------------------------------------- |
| **Node.js** | 22.x (LTS)                 | 20.x also works                        |
| **npm**     | 10+ (bundled with Node 22) | Do not use Yarn — lockfile is npm-only |
| **Git**     | Any recent version         | —                                      |

Check your versions:

```bash
node --version   # should print v22.x.x
npm --version    # should print 10.x or higher
```

No other system tools are required. The WASM binaries are pre-built and checked into the repo (`src/api/Diablo.wasm`, `src/api/DiabloSpawn.wasm`, `src/mpqcmp/MpqCmp.wasm`), along with the Emscripten JS glue files (`*.jscc`).

---

## Cloning the Repository

```bash
git clone https://github.com/awest813/OpenTristam.git
cd OpenTristam
```

---

## Installing Dependencies

```bash
npm ci --legacy-peer-deps
```

**Why this flag?**

`--legacy-peer-deps` is required because `peerjs@1.4.7` declares peer-dependency ranges that npm 7+ rejects without it. This flag restores npm 6-era resolution behavior.

`npm ci` ensures a reproducible install from the lockfile rather than re-resolving version ranges.

The install should complete in under two minutes on a standard connection. There are no native module builds.

---

## Development Server

```bash
npm start
```

This starts the **Vite** dev server on **http://localhost:5173** (Vite's default port).

### Shareware mode (no game files needed)

The shareware archive is committed at `public/spawn.mpq`, so `npm start` is enough. **Play Shareware** downloads it from the same server (`public/` in development, the site root when deployed) and caches it in IndexedDB.

The file is the freely redistributable shareware data from the [DevilutionX assets release](https://github.com/diasurgical/devilutionx-assets/releases/tag/v2) (25,448,219 bytes, SHA-256 `64427cd7c1ba904eaa2e0031c16a6b136d0ecef9abc888c5ff8344b459356e38`). `src/api/load_spawn.js` accepts it alongside the original 50 MB release and diabloweb's compressed build. If a fork removes the file, the app reports that the shareware data isn't hosted and suggests loading a local copy through **Select MPQ**.

### Retail mode

Drag and drop `DIABDAT.MPQ` onto the running browser window (or use **Select MPQ**). The file is read in-browser and passed to the game worker; it is not uploaded and not persisted, so it must be selected again on each visit.

### Port conflicts

Set a custom port with the `--port` flag:

```bash
npx vite --port 3000
```

---

## Running Tests

```bash
npm test
```

In a local terminal this runs Jest in **interactive watch mode**. To run all tests once without watching:

```bash
npm test -- --watchAll=false
```

To run tests with coverage:

```bash
npm test -- --watchAll=false --coverage
```

Coverage is collected from all files matching `src/**/*.{js,jsx,ts,tsx}`.

### Automated retail smoke test

For a browser-level retail validation pass with your own legally obtained `DIABDAT.MPQ`, run:

```bash
npm run smoke:retail -- --mpq /path/to/DIABDAT.MPQ
```

What it does:

- starts the local Vite dev server on `http://127.0.0.1:5174/OpenTristam/`
- opens a local Chromium/Chrome-family browser via `playwright-core`
- uploads your MPQ through the in-app file input
- verifies the multiplayer banner does not appear during single-player startup
- advances the menu flow until the New Single Player Hero class-selection screen is reached
- saves screenshots and logs to `output/playwright/retail-smoke/`

Optional variants:

```bash
npm run smoke:retail -- --mpq /path/to/DIABDAT.MPQ --headed
npm run smoke:retail -- --mpq /path/to/DIABDAT.MPQ --browser-path /path/to/chrome
```

You can also provide the asset path through an environment variable:

```bash
DIABDAT_MPQ=/path/to/DIABDAT.MPQ npm run smoke:retail
```

Notes:

- The script requires a local Chromium/Chrome-family browser already installed.
- It uploads the MPQ directly from the path you provide; it does not copy the commercial asset into the repo.
- This is designed for local verification, not CI, because retail game data is not distributed with the project.

### What is tested

| Module                                      | Test file                          |
| ------------------------------------------- | ---------------------------------- |
| Codec (SHA1 stream cipher, MPQ crypto)      | `src/api/codec.test.js`            |
| Packet serialization / multiplayer protocol | `src/api/packet.test.js`           |
| Save-file parsing                           | `src/api/savefile.test.js`         |
| Sound API                                   | `src/api/sound.test.js`            |
| Error reporter                              | `src/api/errorReporter.test.js`    |
| Drag-and-drop detection                     | `src/input/fileDrop.test.js`       |
| File-drop target lifecycle                  | `src/input/fileDropTarget.test.js` |
| Event listener lifecycle                    | `src/input/eventListeners.test.js` |
| Touch controls                              | `src/input/touchControls.test.js`  |
| Keyboard handling                           | `src/input/keyboard.test.js`       |
| Mouse handling                              | `src/input/mouseHandlers.test.js`  |
| Session lifecycle                           | `src/engine/session.test.js`       |
| Session context / UI components             | `src/ui/sessionContext.test.js`    |

Web Worker and WASM-dependent code is not unit-tested (those require a real browser environment). Use the dev server for manual testing.

---

## Linting

```bash
npm run lint
```

ESLint 8 with `eslint:recommended`, `plugin:react/recommended`, `plugin:react-hooks/recommended`, and `plugin:jsx-a11y/recommended`. The CI gate allows up to 50 warnings before failing.

To auto-fix safe violations:

```bash
npm run lint -- --fix
```

---

## Production Build

```bash
npm run build
```

Vite builds a production bundle into `build/`. No special environment flags are needed — the old `NODE_OPTIONS=--openssl-legacy-provider` workaround (required by Webpack 4) is gone.

The production bundle includes:

| Output                | Description                                    |
| --------------------- | ---------------------------------------------- |
| `build/assets/*.js`   | Chunked JS bundles (main + workers split)      |
| `build/assets/*.css`  | Minified CSS                                   |
| `build/assets/*.wasm` | WebAssembly binaries (served as static assets) |
| `build/index.html`    | Main entry point                               |
| `build/storage.html`  | Cross-origin storage helper (IndexedDB bridge) |

### Preview the production build locally

```bash
npm run preview
```

Vite starts a local preview server at **http://localhost:4173**.

### Enforce bundle budgets locally

After building, run:

```bash
npm run check:bundle-budget
```

This validates gzip-compressed size budgets for:

- main JS chunk (the code needed for the start screen; the game runtime, Save Manager and crash reporting are lazy chunks)
- worker JS (`*.worker` bundles)
- total JS (main + workers + lazy chunks)
- total CSS
- total WASM

If a budget is exceeded, the command exits non-zero and prints the failing metric(s).  
You can temporarily override thresholds via environment variables such as:

- `BUNDLE_BUDGET_MAIN_JS_GZIP_BYTES`
- `BUNDLE_BUDGET_WORKER_JS_GZIP_BYTES`
- `BUNDLE_BUDGET_TOTAL_JS_GZIP_BYTES`
- `BUNDLE_BUDGET_TOTAL_CSS_GZIP_BYTES`
- `BUNDLE_BUDGET_TOTAL_WASM_GZIP_BYTES`

---

## Deploying to GitHub Pages

The `deploy` script uses [gh-pages](https://github.com/tschaub/gh-pages) to push the `build/` directory to the `gh-pages` branch.

```bash
npm run build
npm run deploy
```

This requires push access to the repository. The live site at [https://awest813.github.io/OpenTristam/](https://awest813.github.io/OpenTristam/) is served from that branch.

The Vite build sets `base: '/OpenTristam/'` so all asset paths are rooted correctly under the GitHub Pages sub-path.

---

## Self-Hosted Multiplayer Relay

If you run your own multiplayer relay endpoint, see:

- [docs/self-host-relay.md](self-host-relay.md)

That guide covers runtime client configuration (`transport=websocket` + `websocketUrl`) and operational relay requirements.

---

## Rebuilding the WebAssembly Modules

The pre-built WASM binaries are committed to the repository. You only need to rebuild them if you are modifying the C++ game engine.

The C++ source lives in the separate [d07RiV/devilution](https://github.com/d07RiV/devilution) repository — a fork of [diasurgical/devilution](https://github.com/diasurgical/devilution) with browser-specific adaptations.

### Build environment

Emscripten is required to compile the C++ source to WebAssembly.

```bash
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
```

### Compile

Follow the build instructions in [d07RiV/devilution](https://github.com/d07RiV/devilution). The output files map to this repository as:

| Output file                   | Destination in this repo   |
| ----------------------------- | -------------------------- |
| `Diablo.js` (Emscripten glue) | `src/api/Diablo.jscc`      |
| `Diablo.wasm`                 | `src/api/Diablo.wasm`      |
| `DiabloSpawn.js`              | `src/api/DiabloSpawn.jscc` |
| `DiabloSpawn.wasm`            | `src/api/DiabloSpawn.wasm` |
| `MpqCmp.js`                   | `src/mpqcmp/MpqCmp.jscc`   |
| `MpqCmp.wasm`                 | `src/mpqcmp/MpqCmp.wasm`   |

The `.jscc` extension is the convention used in this project for Emscripten JS-glue files. They are wrapped as ES modules by the `jsccPlugin()` in `vite.config.js` and, in the Jest test environment, stubbed via `config/jest/fileMock.js`.

After replacing the files, run `npm run build` and verify the game boots correctly.

---

## Environment Variables

Vite injects environment variables at build time via `define` in `vite.config.js`. You can also use `.env` files at the repo root (Vite loads them automatically).

| Variable        | Default                      | Purpose                                                                               |
| --------------- | ---------------------------- | ------------------------------------------------------------------------------------- |
| `VITE_*` prefix | —                            | Any `VITE_`-prefixed variable is exposed to browser code via `import.meta.env.VITE_*` |
| `NODE_ENV`      | `development` / `production` | Set automatically by Vite                                                             |
| `PORT`          | `5173`                       | Dev server port (use `--port` CLI flag or `server.port` in vite.config.js)            |

For local development you almost never need to set anything manually.

---

## Common Issues

### `npm ci` fails with peer dependency errors

**Cause:** Running without `--legacy-peer-deps`.

**Fix:**

```bash
npm ci --legacy-peer-deps
```

---

### Blank screen / "Loading…" hangs in dev mode

**Likely causes:**

1. **Missing `spawn.mpq`** — It ships in `public/`; if your checkout lacks it (e.g. a sparse clone), restore it or drag-drop `DIABDAT.MPQ` onto the page.
2. **Stale service worker** — Open DevTools → Application → Service Workers → Unregister, then hard-reload.

---

### Game loads but there is no audio

**Cause:** Browsers suspend `AudioContext` until a user gesture is detected.

**Fix:** Click or tap anywhere on the page. The game's Web Audio context resumes on the first interaction.

---

### Dev server `EADDRINUSE` (port in use)

```bash
npx vite --port 4000
```

Or set `server.port` in `vite.config.js`.

---

## CI Workflow Summary

The `.github/workflows/ci.yml` workflow runs on every push and pull request:

```
actions/checkout@v4
actions/setup-node@v4 (node-version: 22, cache: npm)
npm ci --legacy-peer-deps
npm run lint -- --max-warnings 50
npm test -- --watchAll=false --ci
npm run build
npm run check:bundle-budget
```

All five steps (install → lint → test → build → bundle budget) must pass before a PR can merge.
