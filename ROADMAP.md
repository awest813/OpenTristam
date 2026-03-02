# DiabloWeb Roadmap

This document tracks the feature goals and technical modernization work for DiabloWeb. It is organized by phase and updated as work progresses.

For the detailed engineering breakdown of each phase (exit criteria, ticket list, risks), see [docs/modernization-roadmap.md](docs/modernization-roadmap.md).

---

## Status Key

| Symbol | Meaning |
|---|---|
| ✅ | Done |
| 🔄 | In progress |
| 🔲 | Planned |
| ⏸ | Deferred / on hold |

---

## Phase 0 — Baseline and Safety Net

Goal: establish CI, documentation, and minimum test coverage before any structural changes.

- ✅ Architecture overview doc (`docs/architecture-overview.md`)
- ✅ System flow diagrams (`docs/system-diagrams.md`)
- ✅ ADR template (`docs/adr-template.md`)
- ✅ GitHub Actions CI (lint + tests + build on every push and PR)
- ✅ Unit tests for packet codec (`src/api/packet.test.js`)
- ✅ Unit tests for save-file parser (`src/api/savefile.test.js`)
- ✅ Unit tests for codec encryption (`src/api/codec.test.js`)
- ✅ Unit tests for sound API (`src/api/sound.test.js`)
- ✅ Extract drag-and-drop detection into `src/input/fileDrop.js`
- ✅ Extract event listener lifecycle into `src/input/eventListeners.js`
- ✅ Extract file-drop target lifecycle into `src/input/fileDropTarget.js`
- ✅ Unit tests for all extracted input modules
- ✅ README overhaul
- ✅ Build guide (`docs/build-guide.md`)
- ✅ Root roadmap (`ROADMAP.md`)

---

## Phase 1 — App Surface Decomposition

Goal: reduce `App.js` from a monolithic orchestration class to a thin composition shell.

- ✅ Extract touch state machine from `App.js` into `src/input/touchControls` with unit tests
- ✅ Extract game session lifecycle (start / stop / reset / error) into `src/engine/session.js`
- ✅ Extract save-file management UI into `src/ui/SaveManager` (self-contained, own state)
- ✅ Extract error reporting overlay into `src/ui/ErrorOverlay`
- ✅ Extract MPQ compression UI into `src/ui/MpqCompressor` (moved from `src/mpqcmp/index.js`)
- ✅ Introduce centralized error reporter with diagnostics sink (`src/api/errorReporter.js`)
- ✅ Extract keyboard handling into `src/input/keyboard.js` with unit tests
- ✅ Extract mouse handling into `src/input/mouseHandlers.js` with unit tests
- ✅ Extract loading and start screen UI into `src/ui/LoadingScreen` and `src/ui/StartScreen`
- ✅ `App.js` LOC reduced by 45% (693 → 381 lines); all extracted modules have unit tests
- ✅ Introduce formal session context (React Context) so UI components don't depend on `App` internals

---

## Phase 2 — Toolchain Upgrade

Goal: replace the CRA-era Webpack 4 / React 16 / Jest 24 stack with a faster, better-supported toolchain.

- ✅ Evaluate Vite + React 18 migration track (preferred) vs Webpack 5 fallback — Vite 6 chosen
- ✅ Migrate bundler — Webpack 4 → Vite 6; workers use `?worker`, WASM uses `?url`, `.jscc` files wrapped via custom Vite plugin; build: 149 modules in ~1.6s
- ✅ Upgrade React from 16 to 18 (createRoot, IS_REACT_ACT_ENVIRONMENT, updated tests)
- ✅ Upgrade Jest to 29 + jsdom 20+ (moduleNameMapper for binary assets, transform API, window.location fix)
- ✅ Replace legacy ESLint plugin set (eslint@5 + babel-eslint) with eslint@8 + @babel/eslint-parser + react/react-hooks/jsx-a11y plugins; lint step added to CI
- ✅ Measure and record before/after: prod build was ~60s (Webpack 4) → ~1.6s (Vite 6); dev startup: cold HMR now ~300ms vs ~15s
- ✅ Verify `--openssl-legacy-provider` workaround is no longer needed — removed from CI; Node 20 → 22
- ✅ Document new contributor setup steps (see `docs/build-guide.md`; clone-to-running target met)

---

## Phase 3 — Runtime Boundary Hardening

Goal: make the worker, storage, and loader boundaries explicit, typed, and safely teardown-able.

- 🔲 Define formal worker message types (request / response / event schemas)
- 🔲 Add adapter shim so existing implicit messages continue to work during migration
- 🔲 Split loader adapters: separate render, audio, fs, and transport concerns
- 🔲 Introduce explicit lifecycle disposal (interval cleanup, listener teardown, worker terminate)
- 🔲 Add worker startup/shutdown integration tests (no leaked intervals or listeners after teardown)
- 🔲 Add storage service API with explicit operations (list / import / export / delete / clear)
- 🔲 Make storage errors surface to UI instead of silently falling back to in-memory stubs

---

## Phase 4 — Multiplayer Reliability and Observability

Goal: make multiplayer failures diagnosable, recoverable, and visible to users.

- 🔲 Add `Transport` abstraction with PeerJS and WebSocket as interchangeable adapters
- 🔲 Add structured event logging for connect / join / reject / disconnect paths
- 🔲 Surface connection state in UI (connecting, connected, disconnected, error)
- 🔲 Add actionable recovery UI for common multiplayer failures (retry, copy ID, share link)
- 🔲 Establish protocol version policy — server and client handshake version checks
- 🔲 Add multiplayer compatibility regression tests to CI
- 🔲 Document relay server (`diablo.rivsoft.net`) setup for self-hosting

---

## Phase 5 — UX, Accessibility, and Performance (Ongoing)

Goal: incremental quality-of-life improvements without regressions.

### Touch / Mobile
- 🔲 Configurable touch button layout presets saved per-device
- 🔲 Improved 2-finger pan sensitivity and dead-zone tuning
- 🔲 Gesture conflict resolution (pan vs. tap vs. long-press)
- 🔲 Mobile onboarding flow for first-time DIABDAT.MPQ import

### Accessibility
- 🔲 Keyboard-navigable UI overlays (save manager, error overlay, game menu)
- 🔲 Focus management on dialog open/close
- 🔲 ARIA labels on canvas and interactive overlays
- 🔲 High-contrast mode for UI chrome (game canvas rendering is unchanged)

### Performance
- 🔲 Measure and reduce main-thread blocking during game startup
- 🔲 Profile and optimize text-draw and render-patch costs in the worker
- 🔲 Lazy-load MPQ compression tool (not needed on startup)
- 🔲 Reduce initial JS bundle size; establish a size budget enforced in CI

### PWA
- 🔲 Service worker update flow with clear user notification
- 🔲 Offline-capable shareware mode (all assets pre-cached)
- 🔲 Install prompt surfaced at the right moment (after game loads successfully)

---

## Deferred / Considering

These items are tracked but not scheduled.

- ⏸ TypeScript migration — currently blocked by the toolchain upgrade; revisit in Phase 2
- ⏸ Audio improvements — low-latency scheduling for sound effects
- ⏸ Gamepad / controller input support
- ⏸ Save-file cross-browser sync (export/import flow exists; cloud sync would need a backend)
- ⏸ Self-hostable relay server documentation and Docker image

---

## How to Contribute

If you want to pick up a `🔲 Planned` item:

1. Check [docs/modernization-roadmap.md](docs/modernization-roadmap.md) for engineering context on the relevant phase.
2. Open an issue describing your approach before starting large changes.
3. All PRs must pass CI and include tests for changed behavior.
4. See [README.md](README.md#contributing) for the full contributing guidelines.
