# OpenTristam

> Play Diablo 1 in a modern browser using WebAssembly, with local save persistence, touch controls, and multiplayer support.

[![CI](https://github.com/awest813/OpenTristam/actions/workflows/ci.yml/badge.svg)](https://github.com/awest813/OpenTristam/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-1.0.39-blue.svg)](package.json)

---

## What is OpenTristam?

OpenTristam is a browser-based runtime for Diablo 1, built on the reverse-engineered [devilution](https://github.com/diasurgical/devilution) engine. It compiles the original game engine to **WebAssembly** and wraps it in a modern React app shell — no installation required.

At runtime:

- The game engine runs in a **Web Worker** via **WebAssembly**.
- The app shell (React) handles UI, input, storage, and session orchestration.
- Save data and imported MPQ files are persisted locally in **IndexedDB** — nothing is uploaded.
- Multiplayer uses **WebRTC** peer-to-peer first, with a **WebSocket relay** fallback.

---

## Quick start

### Play the shareware version (free)

1. Clone or download the repo and run it locally (see [Local development](#local-development)).
2. Shareware data (`public/spawn.mpq`, ~25 MB) is included in the repository and deployed with the site. Players download it on first launch; it is cached in the browser afterwards.

### Play the full retail version

1. Obtain `DIABDAT.MPQ` from a legitimate Diablo 1 installation (e.g., GOG).
2. Launch the app and drag-and-drop `DIABDAT.MPQ` into the browser window, or use the upload prompt.
3. The file is read locally in your browser — it is never uploaded. It is not kept between visits, so select it again next time.

> **Tip:** If your MPQ is large, use the built-in MPQ compression tool (accessible from the start screen) for faster load times.

---

## Features

| Feature                | Details                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------ |
| **Engine parity**      | Diablo 1 core engine running in-browser via WASM                                     |
| **Shareware + retail** | Works with `spawn.mpq` (free) and `DIABDAT.MPQ` (retail)                             |
| **Multiplayer**        | Peer-to-peer via WebRTC with WebSocket relay fallback                                |
| **Cross-device input** | Keyboard/mouse and touch controls with layout presets                                |
| **Persistent saves**   | Import, export, and delete saves entirely within the browser                         |
| **Accessibility**      | Keyboard-navigable overlays, ARIA labels, high-contrast UI mode                      |
| **Installable PWA**    | Opens offline after one visit; shareware stays playable offline after the first game |

---

## Local development

### Prerequisites

- Node.js 20+
- npm

### Setup and run

```bash
git clone https://github.com/awest813/OpenTristam.git
cd OpenTristam
npm ci --legacy-peer-deps
npm start
```

The dev server starts at `http://localhost:5173`.

To test on another device on your local network (e.g., phone or tablet):

```bash
npm start -- --host 0.0.0.0
```

Then navigate to `http://<your-machine-ip>:5173` on the second device.

Shareware data ships in `public/spawn.mpq`, so **Play Shareware** works out of the box.

### Build and test

```bash
npm test                                          # run unit tests
npm run build                                     # production build
npm run smoke:retail -- --mpq /path/to/DIABDAT.MPQ  # retail smoke test
npm run lint                                      # lint source files
npm run check:bundle-budget                       # verify bundle size thresholds
npx playwright test e2e/flows                     # browser flows (builds + serves the app)
```

The browser flows need a Playwright Chromium (`npx playwright install chromium`). The visual specs in `e2e/visual` compare against screenshot baselines, which are not committed yet.

For full setup and troubleshooting, see [docs/build-guide.md](docs/build-guide.md).

---

## Architecture

High-level data flow:

1. **`src/App.js`** — coordinates session lifecycle, overlays, and input wiring.
2. **`src/api/loader.js`** — boots the worker and adapts audio/render/storage/network boundaries.
3. **`src/api/game.worker.js`** — hosts the WASM engine loop and game-side APIs.
4. **`src/fs.js`** — persists files/saves through IndexedDB.
5. **`src/api/transports/`** — multiplayer transport abstraction (PeerJS + WebSocket adapters).

Further reading:

- [docs/architecture-overview.md](docs/architecture-overview.md)
- [docs/system-diagrams.md](docs/system-diagrams.md)
- [docs/self-host-relay.md](docs/self-host-relay.md)

---

## Project status

OpenTristam is actively maintained and currently in **Phase 5** (UX, Accessibility, and Performance).

| Phase     | Status     | Summary                                                                                        |
| --------- | ---------- | ---------------------------------------------------------------------------------------------- |
| Phase 0–2 | ✅ Done    | Foundations, app shell decomposition, Vite 6 + React 18 + Jest 29 migration                    |
| Phase 3   | ✅ Done    | Runtime boundary hardening — formal worker message types, adapter splits, lifecycle disposal   |
| Phase 4   | ✅ Done    | Multiplayer reliability — transport abstraction, diagnostics, connection status UX, relay docs |
| Phase 5   | 🚧 Active  | UI polish, accessibility, mobile UX, performance profiling                                     |
| Phase 6   | 🔲 Planned | Developer experience, documentation, E2E testing, community growth                             |

See [ROADMAP.md](ROADMAP.md) for detailed milestone tracking.

---

## Contributing

Contributions are welcome! Here's how to get involved:

1. Check [ROADMAP.md](ROADMAP.md) for planned work items (look for 🔲).
2. Open a scoped issue describing the change and any risks before coding.
3. Submit a PR with tests where feasible. The test suite should grow, not shrink.
4. Update relevant docs when workflows, setup, or user-visible behavior changes.

---

## Legal

Diablo is a trademark of Blizzard Entertainment. **This project does not distribute any commercial game assets.** You must supply your own legally obtained `DIABDAT.MPQ` for full-version play. The shareware data in `public/spawn.mpq` is the freely redistributable Diablo shareware archive, taken from the [DevilutionX assets release](https://github.com/diasurgical/devilutionx-assets/releases/tag/v2) (SHA-256 `64427cd7c1ba904eaa2e0031c16a6b136d0ecef9abc888c5ff8344b459356e38`).

---

## Credits

- [d07RiV/diabloweb](https://github.com/d07RiV/diabloweb) — original browser-based Diablo runtime
- [diasurgical/devilution](https://github.com/diasurgical/devilution) — reverse-engineered Diablo 1 engine
- All contributors who have improved browser compatibility, tooling, accessibility, and UX
