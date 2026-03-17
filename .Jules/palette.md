## 2026-03-04 - Screen Reader Compatibility for Loading Bars
**Learning:** Loading progress bars that only rely on visual width scaling (`span` with dynamic `%` width) completely hide their progress context from screen readers. Since loading states can persist for several seconds (e.g., MPQ compression), this creates an ambiguous "dead zone" for visually impaired users.
**Action:** Always append `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, and `aria-valuemax` to dynamic width progress spans.
## 2024-03-08 - Accessible Touch Overlays
**Learning:** Standard mobile touch control overlays implemented with `<div>` elements natively lack accessibility properties, rendering them completely invisible to screen readers and keyboard navigation.
**Action:** Always add `role="button"`, `tabIndex={0}`, and explicit `aria-label` attributes to custom touch overlay interactions to ensure inclusive design.
## 2026-03-17 - Removed "Click here" anti-pattern in StartScreen
 **Learning:** Using "Click here to [do action]" is a common accessibility anti-pattern in React apps that negatively impacts screen readers and link scannability. Long explanation text inside the interactive element also clutters focus navigation.
 **Action:** Isolate the core action (e.g., "Compress the MPQ") as the button text and move supplementary explanation (e.g., "to greatly reduce its size") to adjacent standard text nodes.
