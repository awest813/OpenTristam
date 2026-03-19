## 2026-03-04 - Screen Reader Compatibility for Loading Bars
**Learning:** Loading progress bars that only rely on visual width scaling (`span` with dynamic `%` width) completely hide their progress context from screen readers. Since loading states can persist for several seconds (e.g., MPQ compression), this creates an ambiguous "dead zone" for visually impaired users.
**Action:** Always append `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, and `aria-valuemax` to dynamic width progress spans.
## 2024-03-08 - Accessible Touch Overlays
**Learning:** Standard mobile touch control overlays implemented with `<div>` elements natively lack accessibility properties, rendering them completely invisible to screen readers and keyboard navigation.
**Action:** Always add `role="button"`, `tabIndex={0}`, and explicit `aria-label` attributes to custom touch overlay interactions to ensure inclusive design.
## 2026-03-19 - Replacing 'Click here' anti-patterns in links and buttons
**Learning:** The "Click here" anti-pattern reduces both scannability for sighted users and usability for screen reader users, who often navigate by reading out a list of links or buttons without surrounding context. Long explanatory phrases inside interactive elements also clutter the UI.
**Action:** Always ensure that link and button texts use concise, action-oriented phrases (e.g., 'Compress the MPQ'). Move any lengthy, non-actionable explanatory text outside the interactive element to improve scannability and screen reader compatibility.
