# Accessibility

OpenTristam includes an accessibility-first UI layer around the game canvas.

## Current accessibility features

- Dialog surfaces use `DialogFrame` with:
  - focus trap
  - keyboard tab cycling
  - escape-to-close support when provided
  - ARIA roles/labels
- Loading states include `role="status"` and live-region announcements.
- Error surfaces use `role="alertdialog"` with clear recovery actions.
- High-contrast mode is available from the start screen settings panel.
- Start-screen instructions avoid sensory/spatial phrasing (WCAG 1.3.3).
- Primary actions target at least 44px touch height on narrow viewports.
- Visible `:focus-visible` outlines are standardized across interactive controls.

## ARIA patterns in use

- `role="dialog"` and `role="alertdialog"` for overlays
- `aria-live="polite"` for onboarding and loading messaging
- `aria-busy="true"` for active loading state
- `role="progressbar"` with value attributes for progress indicators

## Target conformance

The project targets practical WCAG 2.1 AA alignment for the web shell and UI controls around gameplay surfaces.

## Verification checklist

- Keyboard-only navigation across all menus and overlays
- Focus order and focus return after closing dialogs
- Contrast checks for default and high-contrast modes
- Screen reader announcement checks for loading and error states
