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
- `touchcancel` cleanup for sticky touch mods and held pan/F-keys.
- In-game touch gesture tip under Settings / mobile onboarding.

### Changed

- Professional polish pass across metadata, styling tokens, CI coverage, and quality tooling.
- Decluttered start screen: removed redundant step list, tightened mobile onboarding, improved narrow-viewport layout.
- Expanded design tokens for inset surfaces, text hierarchy, success accents, and touch targets.
- MPQ compressor copy no longer relies on spatial “button below” instructions.
- Dialogs focus primary actions first; file pickers reset so the same file can be reselected.
- Drop hints and launch guards give contextual feedback instead of failing silently.
- Multiplayer copy feedback uses notices instead of overwriting status text; reconnect labeled “Force reconnect”.
- Compression failures stay in the compressor dialog with Try again / Back.
- Touch pipeline skips shell chrome so mid-game banners stay tappable.
- F5–F8 and two-finger pan now emit matching key-up events.
- Fullscreen-on-touch is requested once per session and failures are ignored.
- Belt slot canvases reuse a single child instead of stacking on remount.
- Touch pad labels use Move / Right-click / Shift / F5–F8 names.
- Start dialogs size against the viewport (up to 600px) so Shareware / Retail cards sit side by side on desktop and landscape phones; short screens get a compact header.
- Error overlay focuses its primary recovery action first.
- Start-screen performance: the main bundle drops from 144 KB to 68 KB gzip. The game runtime (worker bridge, PeerJS/WebRTC, axios), the Save Manager (with FontAwesome) and `sourcemapped-stacktrace` now load on demand, and the runtime is prefetched while the start screen is idle. On a throttled mid-range phone profile the start screen appears ~0.5 s sooner (1.6 s → 1.15 s) with about half the blocking time.
- Cached MPQ archives stay in IndexedDB until a launch needs them instead of being read into memory on every page load (a 50 MB `spawn.mpq` cost an 80–300 ms main-thread stall and ~50 MB of heap at startup). Retail launches also no longer copy a cached shareware archive into the worker.
- The service worker caches the content-hashed engine `.wasm` files, so repeat launches skip a ~1.5 MB download and offline play works after the first game.
- Bundle budget check classifies worker vs lazy chunks correctly and lowers the main-chunk budget to 90 KiB.
- Downloads (shareware data, engine wasm, compressor assets) use a small streaming `fetch` helper instead of axios, cutting another ~11 KiB gzip of JS (the game worker shrinks from 71 KB to 55 KB) and writing large downloads straight into a preallocated buffer.
- `.prettierignore` keeps the pre-commit hook from reformatting lockfiles.

### Removed

- Google Universal Analytics (`react-ga`): the property stopped processing data in 2023, so it only cost a script download and requests.
- `axios` (0.21.x, with published security advisories) — replaced by `fetch`.

### Fixed

- Browser saves never persisted: Vite stubbed out the Node `events` module `idb-kv-store` depends on, so storage always fell back to read-only and showed the storage warning. The build now uses the package's self-contained browser bundle.
- Error overlay **Back to start** / **Reload page** rendered as unstyled browser buttons.
- Bold copy (`<strong>`) rendered as plain text because of the CSS reset.
- Initial dialog focus no longer scrolls the title out of view on short screens.
- Storage warning banner can be dismissed instead of permanently covering the start screen.
- Errors while offline were always reported as "Connection problem", even for a corrupt MPQ in a game that can now run offline; known game errors now take precedence. Server-side HTTP failures (5xx/408/429, including the service worker's offline 503) count as connection problems, and a 404 gets its own message.
- Save Manager briefly rendered its empty state before the list loaded, dropping keyboard focus to the page so Escape stopped closing it.
- Contrast and touch-target fixes: card labels, loading text, install "Not now", toast dismiss buttons, and onboarding "Got it" links; links follow high-contrast mode.
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
