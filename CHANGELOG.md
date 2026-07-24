# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Repository governance files, contribution and security policy.
- Community issue and pull request templates.
- Collapsible start-screen Settings panel for touch/display controls.
- OpenTristam brand line on the start header.
- Soft “Back to start” recovery and Copy details on the error overlay.
- Storage banner Retry action and truthful read-only fallback failures.
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
- Manage Saves presence syncs after deleting the last save.
- Offline-ready toast no longer appears during active gameplay.

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
