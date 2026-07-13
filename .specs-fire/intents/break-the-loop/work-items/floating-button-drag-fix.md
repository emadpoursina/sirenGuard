---
id: floating-button-drag-fix
title: Floating button drag-and-drop repositioning (fix)
intent: break-the-loop
complexity: medium
mode: confirm
status: completed
depends_on: []
created: 2026-07-13T10:51:00-07:00
run_id: run-sirenguard-008
completed_at: 2026-07-13T18:01:51.666Z
---

# Work Item: Floating button drag-and-drop repositioning (fix)

## Description

Fix the floating button so it is reliably movable by mouse by grabbing the button itself. Today the window is 64×64 with a centered 48×48 button set to `-webkit-app-region: no-drag`, leaving only an ~8 px transparent border as the draggable region — effectively unusable. A long press on the button currently does nothing (`renderer/button.js:43-45`).

Implement JS drag in `renderer/button.js`: on `mousedown` on the button, record the start position and window origin; on `mousemove` beyond a small movement threshold, enter drag mode and move the floating window via a new/extended IPC (`set-position` or extend `save-position` to also call `setPosition`); on `mouseup`, if the movement stayed below the threshold and the press was short (< ~200 ms), treat it as a click (arm/cancel) as today. Persist the final position to `buttonPosition` via the existing `save-position` handler so it survives restarts. Keep "Reset position" in Settings working.

## Acceptance Criteria

- [ ] The button is movable by mouse by pressing and dragging the button itself (not just an invisible border)
- [ ] A short stationary press (< ~200 ms, movement below threshold) still arms/cancels as today
- [ ] A drag beyond the movement threshold moves the floating window and does not trigger arm/cancel
- [ ] The dragged position persists across restarts via the existing `buttonPosition` store
- [ ] "Reset position" in Settings still repositions the button and broadcasts `settings:changed`
- [ ] Drag works across multi-monitor setups without the window jumping or getting stuck
- [ ] The existing `-webkit-app-region` setup is adjusted (or replaced by JS drag) so the two mechanisms do not conflict
- [ ] No new external dependencies; plain JS in the renderer + a small main-process IPC handler
- [ ] Unit/contract tests cover: drag threshold vs click decision, position persistence IPC, and reset-position still working (mock IPC + window)

## Technical Notes

Expose a main-process handler that calls `floatingWindow.setPosition(x, y)` and `setButtonPosition({ x, y })` (extend `save-position` or add `set-position`). Be careful that `setPosition` during an active drag does not fight Electron's own `moved` handler (`main.js:72-76`) — either disable the native `moved` handler when JS drag is active, or route all moves through the new IPC and keep `moved` as a fallback. Keep the drag smooth by throttling `setPosition` calls to animation-frame cadence. This is the final work item of the intent and is independent of the break-the-loop store.

## Dependencies

(none)
