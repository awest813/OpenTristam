# OpenSnow — Diablo Roadmap

This roadmap tracks modernization and reliability work for the browser-based Diablo runtime.

Status legend:
- ✅ Done
- 🚧 In Progress
- 🔲 Planned
- ⏸ Deferred

---

## 2026 Strategic Objectives

1. **Stabilize architecture boundaries** between app shell, worker, storage, and transports. ✅
2. **Modernize the toolchain** to reduce contributor setup friction and build times. ✅
3. **Increase multiplayer reliability** with better diagnostics and recovery UX. ✅
4. **Improve accessibility and mobile UX** without regressing core gameplay behavior. 🚧
5. **Raise confidence** through targeted unit, integration, and regression coverage. 🚧

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
- ✅ Add structured connection lifecycle logging and error categorization — `src/api/multiplayerDiagnostics.js` + transport lifecycle hooks
- ✅ Expose connection status in UI (`connecting`, `connected`, `retrying`, `failed`) — `src/ui/MultiplayerStatusBanner.js`
- ✅ Add guided recovery actions (retry, reconnect, copy session ID, share link) — banner actions wired through loader transport controls
- ✅ Add handshake/version checks to reduce protocol mismatch failures — diagnostics classify reject/version protocol mismatch paths
- ✅ Add compatibility regression tests for common join/host flows — `src/api/transports/peerjsTransport.test.js`, `src/api/transports/websocketTransport.test.js`, `src/api/transports/index.test.js`
- ✅ Publish self-host relay server documentation for advanced users — `docs/self-host-relay.md`

---

## Phase 5 — UX, Accessibility, and Performance

**Goal:** iterative improvements that preserve gameplay correctness.

### Mobile & Touch
- ✅ Layout presets for touch controls (`default`, `compact`, `thumb` presets)
- ✅ Better two-finger pan sensitivity calibration (low/normal/high thresholds)
- ✅ Gesture conflict handling (tap/pan/long-press)
- ✅ First-run onboarding for MPQ import on mobile (dismissible and persisted)

### Accessibility
- ✅ Keyboard-operable overlay controls
- ✅ Focus trap + return-focus behavior for dialogs
- ✅ Improved ARIA labeling and semantic landmarks in app chrome
- ✅ Optional high-contrast UI mode (outside core game rendering)

### UI Polish
- ✅ Diablo-themed start screen with game title header
- ✅ Smooth button transitions and hover animations
- ✅ Improved dialog visual hierarchy and typography
- ✅ Enhanced loading screen progress indicator styling
- ✅ Consistent gold/dark color palette across all overlays

### Performance
- ✅ Reduce startup main-thread blocking
- 🔲 Profile worker hotspots and optimize render patch pipeline
- ✅ Lazy-load MPQ compression tooling (loaded only when compressor UI opens)
- ✅ Add bundle-size budget checks in CI (`npm run check:bundle-budget`)
- ✅ Add viewport-aware render throttling for hidden/inactive tabs (`renderAdapter.setVisible`)
- ✅ Expand bundle budget enforcement to include worker chunks (`BUNDLE_BUDGET_WORKER_JS_GZIP_BYTES`)
- ✅ Replace repeated object allocations in high-frequency mouse input handler with pooled struct

### PWA & Offline
- 🔲 Clear service-worker update UX
- 🔲 Reliable offline shareware mode with deterministic precache
- 🔲 Better timing for install prompt surfacing

### Safe High/Medium-Impact Fix Backlog

The items below are scoped for safe, incremental delivery (small PRs, measurable outcomes, and low gameplay risk).

#### Performance (safe, high/medium impact)

| Priority | Impact | Item | Why it's safe | Validation |
| --- | --- | --- | --- | --- |
| P0 | High | Profile and reduce hot-path message churn between `loader.js` and `game.worker.js` (batch/coalesce non-critical events). | Message schema is already formalized; can preserve protocol compatibility with adapter tests. | Add/extend worker message throughput tests + compare frame-time variance before/after. |
| ✅ P0 | High | Add viewport-aware render throttling for hidden/inactive tabs and paused overlays. | Browser visibility APIs are additive and do not alter deterministic simulation when active. | Unit tests around visibility transitions + manual idle CPU measurement. |
| P1 | Medium | Defer non-critical UI overlay work until after session start (diagnostics/history panels). | UI-only scheduling; does not touch game state updates. | Start-time measurements and React profiler capture on cold load. |
| ✅ P1 | Medium | Expand bundle budget enforcement to include worker chunks and source-map deltas. | CI-only guardrail change; no runtime behavior changes. | `npm run check:bundle-budget` with thresholds documented and tracked in PRs. |
| ✅ P2 | Medium | Replace repeated object allocations in high-frequency input handlers with pooled/reused structs. | Localized input-path optimization with existing input tests to prevent behavior drift. | Keyboard/mouse/touch unit tests + perf comparison in devtools allocation timeline. |

#### Other fixes (safe, high/medium impact)

| Priority | Impact | Item | Why it's safe | Validation |
| --- | --- | --- | --- | --- |
| P0 | High | Add explicit stale-session recovery when worker boot fails (single-click restart + diagnostics copy). | Reuses existing diagnostics and session reset paths; no engine logic changes. | Session lifecycle tests + manual failure injection in dev mode. |
| P0 | High | Improve IndexedDB failure handling with clear "read-only fallback" UX and retry. | Error-path only; keeps current storage contract and avoids silent failures. | `fs` adapter tests for init/read/write failures + UI banner assertions. |
| P1 | Medium | Harden multiplayer reconnect backoff limits and jitter to reduce synchronized retry storms. | Transport-layer policy update behind existing abstraction. | Transport adapter tests for retry timing + diagnostics assertions. |
| P1 | Medium | Add deterministic service-worker update prompt flow (`update available` → `reload`) with user control. | UX-only around update lifecycle; avoids implicit auto-reload behavior. | Manual PWA update pass + integration checks for prompt visibility state. |
| P2 | Medium | Add scoped coverage thresholds for core reliability modules (`engine/session`, `api/transports`, `fs`). | CI policy change with phased thresholds; no runtime risk. | CI passes with threshold report attached to PR. |

---

## Phase 6 — Community and Ecosystem Growth

**Goal:** lower the barrier to contribution, improve documentation coverage, and build toward a sustainable maintenance model.

### Documentation
- 🔲 Interactive architecture diagram (Mermaid or equivalent, embedded in docs)
- 🔲 Troubleshooting FAQ for common MPQ import and browser compatibility issues
- 🔲 Video walkthrough of contributor setup and first PR workflow
- 🔲 Changelog generation from conventional commit messages

### Developer Experience
- 🔲 Devcontainer / Codespaces support for zero-setup contributor onboarding
- 🔲 Pre-commit hooks for lint and format checks (Husky or equivalent)
- 🔲 Per-PR bundle size reporting (comment on PR with size diff vs base)
- 🔲 Automated dependency update PRs (Renovate or Dependabot configuration)

### Testing & Quality
- 🔲 E2E smoke tests for critical flows (shareware load, save import, MPQ import)
- 🔲 Visual regression tests for start screen and overlay components
- 🔲 Code coverage thresholds enforced in CI

### Feature Expansion
- 🔲 Save file browser with player stats and class icons
- 🔲 In-app changelog / release notes overlay (shown on version bump)
- 🔲 Keyboard shortcut reference overlay (accessible from start screen)
- ⏸ Gamepad/controller input mapping
- ⏸ Optional cloud save sync (would require backend)

---

## Deferred / Under Consideration

- ⏸ TypeScript migration (revisit after toolchain stabilization)
- ⏸ Advanced low-latency audio scheduling improvements
- ⏸ Official Dockerized relay reference deployment

---

## Contribution alignment

If you want to contribute against this roadmap:

1. Choose a 🔲 planned item and open a scoped issue first.
2. Describe expected behavior changes and risks.
3. Land work in small PRs with tests where feasible.
4. Update docs when workflows, setup, or user-visible behavior changes.
5. Prefer adding tests alongside feature work; the test suite should grow, not shrink.
