# OpenSnow — Diablo Roadmap

This roadmap tracks modernization and reliability work for the browser-based Diablo runtime.

Status legend:
- ✅ Done
- 🚧 In Progress
- 🔲 Planned
- ⏸ Deferred

---

## 2026 Strategic Objectives

1. **Stabilize architecture boundaries** between app shell, worker, storage, and transports.
2. **Modernize the toolchain** to reduce contributor setup friction and build times.
3. **Increase multiplayer reliability** with better diagnostics and recovery UX.
4. **Improve accessibility and mobile UX** without regressing core gameplay behavior.
5. **Raise confidence** through targeted unit, integration, and regression coverage.

---

## Phase 0 — Completed Foundations

- ✅ Worker extraction and loader boundary setup (`src/api/loader.js`, `src/api/game.worker.js`)
- ✅ Input module extraction for file drop and event listener lifecycle
- ✅ Unit tests for packet handling, codec, and key extracted modules
- ✅ Save manager and UI decomposition started from monolithic app flow
- ✅ Build and architecture docs established (`README.md`, `docs/build-guide.md`, architecture docs)

---

## Phase 1 — Application Surface Decomposition

**Goal:** keep `App.js` focused on composition, routing of intent, and top-level state.

### Completed
- ✅ Touch control state machine extraction
- ✅ Keyboard and mouse handler extraction
- ✅ Session lifecycle extraction into dedicated engine/session module
- ✅ Error overlay and save manager isolation
- ✅ Loading/start screen isolation from core orchestration logic

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

## Phase 2 — Toolchain Modernization

**Goal:** replace legacy CRA/Webpack-4 constraints with a maintainable modern stack.

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

**Goal:** prevent lifecycle leaks and reduce implicit coupling across modules.

- ✅ Define formal worker message types (request / response / event schemas) — `src/api/workerMessages.js`
- ✅ Add adapter shim so existing implicit messages continue to work during migration — `WorkerToMain` / `MainToWorker` constants used in both `loader.js` and `game.worker.js`
- ✅ Split loader adapters: separate render, audio, fs, and transport concerns — `renderAdapter.js`, `audioAdapter.js`, `fsAdapter.js`, `transportAdapter.js`
- ✅ Introduce explicit lifecycle disposal (interval cleanup, listener teardown, worker terminate) — `transportAdapter.dispose()` + `dispose()` path in `loader.js`
- ✅ Add worker startup/shutdown integration tests (no leaked intervals or listeners after teardown) — `transportAdapter.test.js`, `renderAdapter.test.js`, `audioAdapter.test.js`, `fsAdapter.test.js`, `workerMessages.test.js`
- ✅ Add storage service API with explicit operations (list / import / export / delete / clear) — `fs.list()` added to both live and fallback implementations
- ✅ Make storage errors surface to UI instead of silently falling back to in-memory stubs — `fs.initError` exposed; `App.js` renders a storage warning banner

---

## Phase 4 — Multiplayer Reliability and Visibility

**Goal:** make multiplayer failures diagnosable and recoverable by users.

- ✅ Introduce transport abstraction (`Transport` interface with PeerJS/WebSocket adapters) — `src/api/transports/index.js`, `peerjsTransport.js`, `websocketTransport.js`
- 🔲 Add structured connection lifecycle logging and error categorization
- 🔲 Expose connection status in UI (`connecting`, `connected`, `retrying`, `failed`)
- 🔲 Add guided recovery actions (retry, reconnect, copy session ID, share link)
- 🔲 Add handshake/version checks to reduce protocol mismatch failures
- 🔲 Add compatibility regression tests for common join/host flows
- 🔲 Publish self-host relay server documentation for advanced users

---

## Phase 5 — UX, Accessibility, and Performance

**Goal:** iterative improvements that preserve gameplay correctness.

### Mobile & Touch
- 🔲 Layout presets for touch controls
- 🔲 Better two-finger pan sensitivity calibration
- 🔲 Gesture conflict handling (tap/pan/long-press)
- 🔲 First-run onboarding for MPQ import on mobile

### Accessibility
- 🔲 Keyboard-operable overlay controls
- 🔲 Focus trap + return-focus behavior for dialogs
- 🔲 Improved ARIA labeling and semantic landmarks in app chrome
- 🔲 Optional high-contrast UI mode (outside core game rendering)

### Performance
- 🔲 Reduce startup main-thread blocking
- 🔲 Profile worker hotspots and optimize render patch pipeline
- 🔲 Lazy-load MPQ compression tooling
- 🔲 Add bundle-size budget checks in CI

### PWA & Offline
- 🔲 Clear service-worker update UX
- 🔲 Reliable offline shareware mode with deterministic precache
- 🔲 Better timing for install prompt surfacing

---

## Deferred / Under Consideration

- ⏸ TypeScript migration (revisit after toolchain stabilization)
- ⏸ Gamepad/controller support
- ⏸ Advanced low-latency audio scheduling improvements
- ⏸ Optional cloud save sync (would require backend)
- ⏸ Official Dockerized relay reference deployment

---

## Contribution alignment

If you want to contribute against this roadmap:

1. Choose a 🔲 planned item and open a scoped issue first.
2. Describe expected behavior changes and risks.
3. Land work in small PRs with tests where feasible.
4. Update docs when workflows, setup, or user-visible behavior changes.
