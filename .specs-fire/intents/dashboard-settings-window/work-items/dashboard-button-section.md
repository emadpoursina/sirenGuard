---
id: dashboard-button-section
title: Dashboard Trigger Button section
intent: dashboard-settings-window
complexity: medium
mode: confirm
status: completed
depends_on:
  - dashboard-shell
  - cancel-window-wiring
created: 2026-07-12T00:31:00-07:00
run_id: run-sirenguard-005
completed_at: 2026-07-12T07:49:17.681Z
---

# Work Item: Dashboard Trigger Button section

## Description

Build the Trigger Button section of the dashboard:
- **Cancel window duration** — slider/input in seconds (default 2, e.g. range 1–10). Writes `cancelWindowSeconds` via `updateSettings`; lock-orchestration picks it up at next arm (work item `cancel-window-wiring`).
- **Button opacity (idle state)** — slider (e.g. 0.1–1.0). Writes `buttonOpacity`; the floating button renderer applies it live on `settings:changed`.
- **Reset button position** — button calling `resetButtonPosition`; main process repositions the floating window and broadcasts `settings:changed`.
- **Button color** — preset swatches (amber/red/etc. — a small fixed palette, not a full color picker). Writes `buttonColor`; floating button renderer applies live.

The floating button renderer (`renderer/button.js` + `renderer/index.html` + `renderer/style.css`) must subscribe to `settings:changed` and apply `buttonOpacity` and `buttonColor` without breaking the existing `-webkit-app-region: drag` behavior or the drag-vs-click threshold.

## Acceptance Criteria

- [ ] Cancel-window slider writes `cancelWindowSeconds` and the next arm uses the new value.
- [ ] Opacity slider live-updates the floating button's idle opacity without a restart.
- [ ] Reset button position snaps the floating window to the default position and persists it.
- [ ] Color swatches live-update the floating button color; selection is preserved across launches.
- [ ] Drag and click on the floating button still work after live style changes (no regression).
- [ ] Settings reopen shows the persisted slider/swatch values.

## Technical Notes

Apply opacity via a CSS variable on the button wrapper (e.g. `--button-opacity`) rather than recomputing inline styles on every event, to keep the drag region intact. Color similarly via a CSS variable (`--button-color`). The button renderer needs a `settings:changed` listener added via `preload.js` (extend the floating button's preload to expose an `onSettingsChanged` callback). Keep the existing pulse/countdown armed-state styles working with the new color variable.

## Dependencies

- dashboard-shell
- cancel-window-wiring
