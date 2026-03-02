# DiabloWeb

> Diablo 1 (1996) running natively in your browser — no plugins, no installs.

[![CI](https://github.com/d07RiV/diabloweb/actions/workflows/ci.yml/badge.svg)](https://github.com/d07RiV/diabloweb/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-1.0.39-blue.svg)](package.json)
[![Live Demo](https://img.shields.io/badge/play-live%20demo-darkred.svg)](https://d07RiV.github.io/diabloweb/)

**[Play now →](https://d07RiV.github.io/diabloweb/)**

DiabloWeb compiles the reverse-engineered [devilution](https://github.com/diasurgical/devilution) game engine to **WebAssembly** and wraps it in a React shell that handles input, audio, networking, and save-file persistence — all inside a standard browser tab.

---

## Contents

- [Features](#features)
- [How to Play](#how-to-play)
- [Running Locally](#running-locally)
- [Building from Source](#building-from-source)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [Credits](#credits)

---

## Features

| Category | Details |
|---|---|
| **Engine** | Full Diablo 1 engine compiled to WebAssembly via Emscripten |
| **Versions** | Shareware (`spawn.mpq`) and full retail (`DIABDAT.MPQ`) |
| **Multiplayer** | Peer-to-peer via WebRTC (PeerJS) and relay via WebSocket |
| **Mobile** | Touch controls with configurable on-screen buttons and 2-finger pan |
| **PWA** | Installable, full-screen, service-worker cached for offline use |
| **Save files** | Persisted in IndexedDB; import/export/download supported |
| **Platforms** | Chrome, Firefox, Safari (desktop and mobile) |
| **No server required** | Shareware mode works entirely client-side; retail game data stays local |

---

## How to Play

### Shareware (free, no files needed)

Visit **[https://d07RiV.github.io/diabloweb/](https://d07RiV.github.io/diabloweb/)**.

The shareware data file (`spawn.mpq`) is served automatically. You can explore the Cathedral through level 4 with one pre-set character.

### Full Retail Game

You need `DIABDAT.MPQ` from a legitimate copy of Diablo 1 (available on [GOG](https://www.gog.com/game/diablo)).

1. Open the live site.
2. Drag and drop `DIABDAT.MPQ` onto the browser window, **or** click the upload button.
3. The file is stored locally in your browser — it is never uploaded to any server.
4. Your save games are also kept in browser storage and persist across sessions.

> **Note:** If your `DIABDAT.MPQ` is larger than ~600 MB, use the built-in MPQ compression tool on the site to produce a trimmed version that loads faster.

### Multiplayer

- **Host:** Click **Create Game** and share the displayed game ID with other players.
- **Join:** Click **Join Game** and enter the host's game ID.
- Both players must be running the same version (shareware or retail).
- WebRTC (direct P2P) is attempted first; the relay server at `diablo.rivsoft.net` is used as a fallback.

---

## Running Locally

See **[docs/build-guide.md](docs/build-guide.md)** for the complete guide. The short version:

```bash
git clone https://github.com/d07RiV/diabloweb.git
cd diabloweb
npm ci --legacy-peer-deps
npm start          # dev server at http://localhost:3000
```

To play the shareware version locally, place `spawn.mpq` inside the `public/` folder before starting. The dev server will serve it automatically.

---

## Building from Source

```bash
npm run build      # production bundle → build/
npm test           # run the test suite
npm run deploy     # push build/ to GitHub Pages (requires repo access)
```

The build requires **Node.js 20** and uses **Webpack 4** with Babel. Full environment details and troubleshooting tips are in **[docs/build-guide.md](docs/build-guide.md)**.

### WebAssembly Modules

The pre-built WASM binaries (`Diablo.jscc`, `DiabloSpawn.jscc`, `MpqCmp.jscc`) are checked into `src/api/` and `src/mpqcmp/`. Rebuilding them from C++ source is a separate process — see the [devilution fork](https://github.com/d07RiV/devilution) for instructions.

---

## Architecture

```
User Input (keyboard / touch / drag-and-drop)
       │
  src/App.js  ─────────────────────────────────────────────────┐
       │                                                         │
  src/api/loader.js  ──────────────────────────────────────┐    │
       │                                                    │    │
  src/api/game.worker.js                             src/fs.js  │
  (WASM engine, render loop)                    (IndexedDB)     │
       │                                                    │    │
  Canvas + Web Audio                      webrtc.js / websocket.js
                                           (P2P / relay multiplayer)
```

Key source files:

| File | Role |
|---|---|
| `src/App.js` | Root React component — input, session lifecycle, UI overlays |
| `src/api/loader.js` | Bootstraps the game worker, wires render/audio/network/storage |
| `src/api/game.worker.js` | Runs inside a Web Worker; drives the WASM game engine |
| `src/api/packet.js` | Binary multiplayer packet serialization |
| `src/api/webrtc.js` | PeerJS WebRTC multiplayer host/client |
| `src/api/websocket.js` | WebSocket relay transport |
| `src/api/savefile.js` | MPQ reader and save-file parser |
| `src/api/codec.js` | Blizzard save-file encryption (SHA1-based stream cipher) |
| `src/fs.js` | IndexedDB persistence layer |
| `src/input/` | Extracted input modules — drag-drop, event listeners, touch |

Detailed docs: [docs/architecture-overview.md](docs/architecture-overview.md) · [docs/system-diagrams.md](docs/system-diagrams.md)

---

## Contributing

Contributions are welcome. Before opening a large PR, please read:

- [docs/modernization-roadmap.md](docs/modernization-roadmap.md) — active work and phase priorities
- [docs/architecture-overview.md](docs/architecture-overview.md) — current module boundaries
- [docs/adr-template.md](docs/adr-template.md) — how to document architecture decisions

**Rules of thumb:**

1. Don't break gameplay — protocol and simulation behavior must remain deterministic.
2. Add or update tests for any changed module.
3. All PRs must pass CI (lint + tests + build) before merging.
4. Prefer incremental, reviewable changes over large rewrites.

---

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the full feature and modernization roadmap.

Current focus (Phase 2): toolchain and dependency modernization while preserving runtime behavior.

---

## Credits

- **[devilution](https://github.com/diasurgical/devilution)** — the reverse-engineered Diablo 1 engine that makes this possible.
- **[d07RiV/devilution](https://github.com/d07RiV/devilution)** — the WebAssembly fork with JS interface modifications.
- **[PeerJS](https://peerjs.com/)** — WebRTC abstraction used for peer-to-peer multiplayer.
- All Diablo 1 game content is property of **Blizzard Entertainment**. This project does not distribute any copyrighted game assets.

---

*DiabloWeb is an unofficial fan project and is not affiliated with or endorsed by Blizzard Entertainment.*
