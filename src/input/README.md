# src/input

Input subsystem for keyboard, mouse, touch gestures, and drag/drop file handling.

Key areas:

- event listener wiring
- pointer/mouse handlers
- touch control mapping and gestures
- MPQ drag/drop ingestion

## Touch controls notes

- Pads: Move / Right-click / Shift (sticky), belt slots, F5–F8.
- Gestures: tap = left click, long-press = right click, drag = hold pointer, two-finger drag = pan.
- `touchcancel` clears sticky mods and held F-key / pan arrow keys.
- Shell chrome (banners, dialogs, buttons) bypasses the game touch pipeline so UI stays tappable mid-play.
- Layout presets (`default` / `compact` / `thumb`) and pan sensitivity live in Settings on the start screen.
