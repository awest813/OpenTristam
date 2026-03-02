# DiabloWeb Modernization Roadmap

This roadmap focuses on practical, low-risk modernization while preserving game behavior and multiplayer compatibility.

## Current Status

- **Phase 0:** Complete.
- **Phase 1:** Complete.
- **Phase 2:** Planned (next active phase).
- Architecture baseline overview: `docs/architecture-overview.md`.
- System flow diagrams (boot/lifecycle/handshake/storage): `docs/system-diagrams.md`.
- ADR template: `docs/adr-template.md`.

## Recent Progress

- Extracted drag/drop file-detection logic from `src/App.js` into `src/input/fileDrop.js` as the first step of Phase 1 decomposition.
- Added unit tests for the extracted file-drop behavior in `src/input/fileDrop.test.js`.
- Added `src/input/fileDropTarget.js` to centralize drag/drop listener lifecycle with explicit `attach()` / `detach()` operations, and wired `App` to use it.
- Added `src/input/eventListeners.js` and moved runtime input/window listener wiring in `App` behind an explicit attach/detach lifecycle to prevent leaked global listeners.
- Added a formal session context (`src/engine/sessionContext.js`) so UI overlays consume session state/actions without relying on `App` prop plumbing.

## Modernization Outcomes

- Faster onboarding and safer contributor workflows.
- Smaller, testable modules instead of a single orchestration-heavy `App` component.
- Better production stability through lifecycle cleanup and structured diagnostics.
- Clear upgrade path for dependencies and build tooling.

## Codebase Findings (Debug Notes)

The following observations come from current implementation hotspots and are prioritized in the plan:

1. `src/App.js` combines UI rendering, drag/drop, touch mapping, keyboard management, save handling, and game lifecycle in one class component.
2. `src/api/loader.js` mixes worker bootstrap, render path, audio forwarding, fs bridging, and network batching.
3. The loader starts recurring intervals/listeners without a centralized shutdown contract.
4. Storage API in `src/fs.js` is usable but has implicit behavior and global `window` side effects.
5. Tooling is on an older CRA-era stack (React 16, Webpack 4, Jest 24, `node-sass`) that increases upgrade friction.

## Non-Negotiables

1. **No gameplay regressions:** protocol and simulation behavior remain deterministic.
2. **Incremental migration:** compatibility adapters first, implementation swaps second.
3. **Type boundaries first:** worker/fs/network contracts get typed before deep refactors.
4. **Observable behavior:** every major step adds measurable checks (tests, CI, logs, perf snapshots).

## Execution Plan

### Phase 0 — Baseline and Safety Net (Week 1)

#### Work
- Add architecture docs for app boot, worker lifecycle, render loop, storage, and multiplayer handshake.
- Stand up CI with lint + unit tests + build.
- Add minimum unit coverage for packet codec and save-file parsing.
- Add a smoke bootstrap test that verifies app initialization path.

#### Exit Criteria
- CI runs on every PR.
- Baseline regression matrix exists (desktop/mobile + spawn/retail + solo/multiplayer).
- First architecture docs are merged.

### Phase 1 — App Surface Decomposition (Weeks 2–4)

#### Work
- Split `App` responsibilities into modules:
  - `engine/` session controller (start, stop, reset, errors)
  - `input/` touch + pointer + keyboard orchestration
  - `ui/` dialogs, overlays, and menus
- Convert high-churn logic to hooks and context for explicit state ownership.
- Isolate DOM-specific operations behind utility hooks/helpers.

#### Exit Criteria
- `App.js` becomes a composition shell.
- Input and engine flows have unit tests.
- Global mutable state usage is reduced and documented.

### Phase 2 — Toolchain & Dependency Upgrade (Weeks 5–6)

#### Work
- Evaluate migration track:
  - preferred: Vite + React 18
  - fallback: Webpack 5 if worker/wasm constraints block Vite parity
- Replace deprecated packages:
  - `node-sass` → `sass`
  - legacy eslint/jest plugin set → maintained equivalents
- Keep reproducible version/build metadata injection.

#### Exit Criteria
- Build/test/dev parity with current behavior.
- Improved local startup/build times are measured and recorded.
- New contributor setup steps are simpler and documented.

### Phase 3 — Runtime Boundary Hardening (Weeks 7–9)

#### Work
- Define typed worker message contracts (request/response/event schema).
- Split loader adapters: render, audio, fs, transport.
- Introduce explicit lifecycle disposal (interval cleanup, listener teardown, worker terminate).
- Add storage service API with explicit operations (list/import/export/delete/clear) and errors.

#### Exit Criteria
- No orphan intervals/listeners after session teardown.
- Worker startup/shutdown integration tests pass.
- Storage operations are deterministic and documented.

### Phase 4 — Multiplayer Reliability & Observability (Weeks 10–12)

#### Work
- Add `Transport` abstraction and keep PeerJS/WebSocket adapters behind it.
- Add structured event logs for connect/join/reject/disconnect paths.
- Surface connection states and actionable failures in UI.
- Establish protocol version policy and compatibility strategy.

#### Exit Criteria
- Multiplayer failures are diagnosable from logs.
- User-facing connection errors have clear recovery guidance.
- Compatibility checks are enforced in CI/regression testing.

### Phase 5 — UX, Accessibility, and Performance (Ongoing)

#### Work
- Improve touch presets and mobile defaults.
- Accessibility pass on overlays/dialogs/focus behavior/keyboard navigation.
- Performance pass for render patching and text draw costs.
- PWA pass for cache/update/offline behavior clarity.

#### Exit Criteria
- Accessibility checklist has no critical blockers.
- Performance budget and tracking are in place.
- Mobile controls meet baseline usability criteria.


## Testing and Quality Plan (Fix)

To remove ambiguity around "testing later," this roadmap requires testing gates from the first phase.

### Required Automated Checks

- **Unit tests** for packet codec, savefile parsing, and extracted input state machines.
- **Integration tests** for worker lifecycle (`init` → running → `dispose`) and storage operations.
- **Smoke test** for app bootstrap and loader startup path.
- **Build verification** for production bundle generation on every PR.

### Required Manual Regression Pass

- Desktop: Chrome, Firefox, Safari (latest stable).
- Mobile: iOS Safari + Android Chrome baseline pass.
- Modes: shareware (`spawn.mpq`) and retail (`DIABDAT.MPQ`) flows.
- Multiplayer: host/join/reject/disconnect scenarios with expected UI states.

### CI Gate Policy

- No PR merges without passing lint + tests + build.
- Version/toolchain migration PRs must attach before/after startup + build-time metrics.
- Runtime boundary changes must include teardown verification (no leaked intervals/listeners/workers).

## Priority Backlog (First 12 Tickets)

1. Add architecture decision record template and initial system diagrams.
2. Add packet codec round-trip tests.
3. Add savefile parser edge-case tests.
4. Extract drag/drop handling from `App` into `useFileDrop`.
5. Extract touch state machine and add tests.
6. Introduce session lifecycle manager with explicit `dispose()`.
7. Add worker message type definitions and adapter shim.
8. Introduce centralized error reporter (UI + diagnostics sink).
9. Add GitHub Actions workflow for lint/test/build.
10. Replace `node-sass` with `sass`.
11. Add transport abstraction for PeerJS/WebSocket.
12. Add multiplayer connection-status indicators and retry actions.

## Risks and Mitigations

- **WASM boundary breakage** → use feature flags and parity verification before defaulting on.
- **Large dependency jumps** → upgrade in small batches with lockfile checkpoints.
- **Mobile control regressions** → maintain manual gesture script + device matrix.
- **Protocol drift in multiplayer** → lock versioning strategy and compatibility tests.

## Success Metrics

- `App.js` responsibility reduced by 40%+ (LOC and concern split).
- PRs are gated by CI (lint + tests + build).
- New setup from clone to running dev ≤ 10 minutes.
- Reduced production error reports and clearer recovery messaging.
- Higher multiplayer join success rate across supported browsers.
