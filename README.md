# OpenSnow — Diablo (DiabloWeb)

> Play Diablo 1 in a modern browser using WebAssembly, with local save persistence, touch controls, and multiplayer support.

[![CI](https://github.com/d07RiV/diabloweb/actions/workflows/ci.yml/badge.svg)](https://github.com/d07RiV/diabloweb/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-1.0.39-blue.svg)](package.json)
[![Live Demo](https://img.shields.io/badge/play-live%20demo-darkred.svg)](https://d07RiV.github.io/diabloweb/)

**Live demo:** [https://d07RiV.github.io/diabloweb/](https://d07RiV.github.io/diabloweb/)

---

## What this project is

This repository packages the reverse-engineered Diablo 1 engine (via [devilution](https://github.com/diasurgical/devilution)) for browser execution.

At runtime:
- The game engine runs in a **Web Worker** via **WebAssembly**.
- The app shell (React) handles UI, input, storage, and session orchestration.
- Save data and imported MPQ files are persisted locally in **IndexedDB**.
- Multiplayer uses **WebRTC** first, with a **WebSocket relay** fallback.

No game data is uploaded by default: imported retail MPQ files stay in browser storage.

---

## Quick start

### Play immediately (shareware)
1. Open the live demo.
2. Start playing (shareware `spawn.mpq` is loaded automatically).

### Play retail Diablo 1
1. Get `DIABDAT.MPQ` from a legitimate installation (e.g., GOG).
2. Open the app.
3. Drag-and-drop `DIABDAT.MPQ` into the game, or use the upload flow.
4. The file is stored locally and reused on next launch.

> Tip: If your MPQ is large, use the in-app MPQ compression tool for faster loads.

---

## Feature overview

- **Engine parity:** Diablo 1 core engine running in the browser.
- **Modes:** Shareware (`spawn.mpq`) and full retail (`DIABDAT.MPQ`).
- **Multiplayer:** Peer-to-peer with fallback relay transport.
- **Cross-device input:** Keyboard/mouse and touch controls.
- **Persistent saves:** Import/export/delete saves without leaving the browser.
- **PWA support:** Installable and offline-capable foundation.

---

## Local development

### Prerequisites
- Node.js 20.x
- npm

### Run in development
```bash
git clone https://github.com/d07RiV/diabloweb.git
cd diabloweb
npm ci --legacy-peer-deps
npm start
```

The dev server runs at `http://localhost:3000`.

For shareware testing, place `spawn.mpq` in `public/`.

### Build and test
```bash
npm test
npm run build
```

For full setup and troubleshooting, see [docs/build-guide.md](docs/build-guide.md).

---

## Architecture map

High-level flow:

1. `src/App.js` coordinates session lifecycle, overlays, and input wiring.
2. `src/api/loader.js` boots the worker and adapts audio/render/storage/network boundaries.
3. `src/api/game.worker.js` hosts the WASM engine loop and game-side APIs.
4. `src/fs.js` persists files/saves through IndexedDB.
5. `src/api/webrtc.js` / `src/api/websocket.js` manage multiplayer transport.

Helpful docs:
- [docs/architecture-overview.md](docs/architecture-overview.md)
- [docs/system-diagrams.md](docs/system-diagrams.md)
- [docs/modernization-roadmap.md](docs/modernization-roadmap.md)

---

## Project status

This project is active and currently focused on:
- continued decomposition of the app shell,
- toolchain modernization,
- stronger runtime boundary contracts,
- multiplayer reliability and diagnostics.

See [ROADMAP.md](ROADMAP.md) for milestone-level planning.

---

## Contributing

Contributions are welcome.

Current focus (Phase 2): toolchain and dependency modernization while preserving runtime behavior.

---

## Legal note

Diablo is a Blizzard Entertainment property. This project does not distribute commercial game assets. You must provide your own legally obtained retail data file (`DIABDAT.MPQ`) for full-version play.

---

## Credits

- [d07RiV/diabloweb](https://github.com/d07RiV/diabloweb) original project
- [diasurgical/devilution](https://github.com/diasurgical/devilution) reverse-engineered Diablo engine
- Contributors maintaining browser compatibility, tooling, and UX improvements
