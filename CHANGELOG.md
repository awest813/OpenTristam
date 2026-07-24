# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Repository governance files, contribution and security policy.
- Community issue and pull request templates.
- Collapsible start-screen Settings panel for touch/display controls.
- OpenTristam brand line on the start header.
- Soft recovery from the error overlay: **Try again** / **Back to start** keep packed assets when possible; **Copy details** copies diagnostics; **Reload page** remains for a full reset.
- Storage banner **Retry storage** to re-probe IndexedDB after a fallback.
- Dismissible service-worker update banner (“Not now”).

### Changed

- Professional polish pass across metadata, styling tokens, CI coverage, and quality tooling.
- Decluttered start screen: removed redundant step list, tightened mobile onboarding, improved narrow-viewport layout.
- Expanded design tokens for inset surfaces, text hierarchy, success accents, and touch targets.
- MPQ compressor copy no longer relies on spatial “button below” instructions.
- Dialogs focus primary actions first; file pickers reset so the same file can be reselected.
- Drop hints and launch guards give contextual feedback instead of failing silently.
- Multiplayer copy feedback uses notices instead of overwriting status text; reconnect labeled “Force reconnect”.
- Compression failures stay in the compressor dialog with Try again / Back.

### Fixed

- High-contrast coverage for install prompt and settings disclosure controls.
- Storage fallback mutators (`update`, `delete`, `clear`) now reject instead of silently succeeding when IndexedDB is unavailable.
- Soft recovery and hard error paths dispose the game session cleanly: boot/runtime errors clear loading state, detach stale listeners, and `createGame` exposes `dispose` so audio/websocket/touch teardown is not skipped.
- Pack upload to the worker copies file buffers before transfer so soft recovery can reuse `fs.files` instead of finding emptied maps after INIT.
- Save deletes that fail no longer report success; `has_saves` refreshes after delete so empty libraries clear correctly.
- Persist/download failures in `fsAdapter` surface a notice instead of failing silently.
- WebSocket version-mismatch and handshake-timeout paths close the socket so reconnect logic is not blocked by a half-open connection.
- Error reporting timeouts wrap `fileUrl` and `mapStackTrace` so a hung helper cannot leave `handleGameError` waiting forever.
- MPQ compressor failures stay in the compressor UI with local retry/back instead of jumping to the global crash overlay.
- Save/load and browser storage edge cases: persist-before-map updates, Safari write probe, delayed download URL revoke, error-overlay blob cleanup, multi-tab save list sync, `.sv`-only uploads, and drop `getAsFile()` null fallback.
- Offline-ready toast no longer appears during active gameplay.

### Changed

- Error and notification copy: friendlier ErrorOverlay tips, mapped MPQ/spawn/assertion messages, no raw storage or transport jargon in banners, clearer multiplayer status text, and polished drop/offline/clipboard notices.

## [1.0.39] - Existing baseline

### Phase 0

- Project bootstrap and initial browser runtime plumbing.

### Phase 1

- Core game runtime integration and asset loading foundation.

### Phase 2

- Input and interaction improvements for keyboard/mouse/touch behavior.

### Phase 3

- Save handling and browser persistence improvements.

### Phase 4

- Multiplayer transport and diagnostics additions.

### Phase 5

- Accessibility and UI workflow improvements across start, loading, and error surfaces.
