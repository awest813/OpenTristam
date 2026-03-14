## 2026-03-04 - Screen Reader Compatibility for Loading Bars
**Learning:** Loading progress bars that only rely on visual width scaling (`span` with dynamic `%` width) completely hide their progress context from screen readers. Since loading states can persist for several seconds (e.g., MPQ compression), this creates an ambiguous "dead zone" for visually impaired users.
**Action:** Always append `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, and `aria-valuemax` to dynamic width progress spans.
## 2024-03-08 - Accessible Touch Overlays
**Learning:** Standard mobile touch control overlays implemented with `<div>` elements natively lack accessibility properties, rendering them completely invisible to screen readers and keyboard navigation.
**Action:** Always add `role="button"`, `tabIndex={0}`, and explicit `aria-label` attributes to custom touch overlay interactions to ensure inclusive design.
## 2026-03-14 - Visually Hidden Interactive Elements
**Learning:** Visually hidden or off-screen input elements (e.g., global game keyboard inputs) used for capture are still accessible to screen readers. Omitting an `aria-label` leads to them being announced ambiguously as 'Input without label'.
**Action:** Always add an `aria-label` to visually hidden interactive inputs to prevent screen reader ambiguity.
