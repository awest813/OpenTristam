## 2026-03-04 - Screen Reader Compatibility for Loading Bars
**Learning:** Loading progress bars that only rely on visual width scaling (`span` with dynamic `%` width) completely hide their progress context from screen readers. Since loading states can persist for several seconds (e.g., MPQ compression), this creates an ambiguous "dead zone" for visually impaired users.
**Action:** Always append `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, and `aria-valuemax` to dynamic width progress spans.
## 2024-03-08 - Accessible Touch Overlays
**Learning:** Standard mobile touch control overlays implemented with `<div>` elements natively lack accessibility properties, rendering them completely invisible to screen readers and keyboard navigation.
**Action:** Always add `role="button"`, `tabIndex={0}`, and explicit `aria-label` attributes to custom touch overlay interactions to ensure inclusive design.
## 2024-03-15 - Screen Reader Support for Hidden Game Inputs
**Learning:** In browser-based games, global keyboard input is often captured using a visually hidden `<input>` element. Even if this element is off-screen, screen readers will still announce it if focused, leading to "Input without label" violations.
**Action:** Always add a descriptive `aria-label` (e.g., `aria-label="Game keyboard input"`) to hidden or global text inputs used for game control to ensure proper accessibility context.
