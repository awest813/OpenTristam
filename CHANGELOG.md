# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Repository governance files, contribution and security policy.
- Community issue and pull request templates.
- Collapsible start-screen Settings panel for touch/display controls.
- OpenTristam brand line on the start header.
- `touchcancel` cleanup for sticky touch mods and held pan/F-keys.
- In-game touch gesture tip under Settings / mobile onboarding.

### Changed

- Professional polish pass across metadata, styling tokens, CI coverage, and quality tooling.
- Decluttered start screen: removed redundant step list, tightened mobile onboarding, improved narrow-viewport layout.
- Expanded design tokens for inset surfaces, text hierarchy, success accents, and touch targets.
- MPQ compressor copy no longer relies on spatial “button below” instructions.
- Touch pipeline skips shell chrome so mid-game banners stay tappable.
- F5–F8 and two-finger pan now emit matching key-up events.
- Fullscreen-on-touch is requested once per session and failures are ignored.
- Belt slot canvases reuse a single child instead of stacking on remount.
- Touch pad labels use Move / Right-click / Shift / F5–F8 names.

### Fixed

- High-contrast coverage for install prompt and settings disclosure controls.

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
