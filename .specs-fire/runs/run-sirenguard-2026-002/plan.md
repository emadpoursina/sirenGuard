# Implementation Plan: Lock/cancel orchestration refactor

- **Work item**: lock-orchestration
- **Intent**: triggers-and-settings
- **Mode**: validate
- **Design doc**: `.specs-fire/intents/triggers-and-settings/work-items/lock-orchestration-design.md` (Checkpoint 1 approved)

## Approach

Promote the 2s arm/cancel countdown from the renderer into a new main-process module `lock-orchestration.js`. The renderer stops owning the timer; instead it calls `arm()`/`cancel()` over IPC and drives its visuals from `armed-state` events pushed by main. The actual `CGSession -suspend` exec moves into the orchestration module. `main.js` wires IPC handlers and attaches the floating window's `webContents` as the event target. `preload.js` replaces `lock` with `arm`/`cancel`/`onArmedState`.

## Implementation Checklist (from design doc)

1. Create `lock-orchestration.js` with `attach`, `arm`, `cancel`, internal `lockScreen`, and `CANCEL_WINDOW_MS` constant.
2. In `main.js`: `require('./lock-orchestration')`, replace `lock-screen` handler with `arm`/`cancel` handlers, call `orchestration.attach(floatingWindow.webContents)` after window creation, remove inline `LOCK_COMMAND`/`lockScreen`.
3. In `preload.js`: replace `lock` with `arm`, `cancel`, and `onArmedState(cb)` (wrapping `ipcRenderer.on('armed-state')`).
4. In `renderer/button.js`: remove local countdown timer; on short click call `arm()` (or `cancel()` if currently armed); subscribe to `onArmedState` to toggle `.armed` class and `countdownRing.hidden`.
5. Manually smoke test via `bun start`: short click arms + locks after 2s; second click during window cancels; drag still works; position still persists.
6. Note the `preload.js` IPC contract change in the PR description.

## Files to Create

- `lock-orchestration.js` — arm/cancel state machine + `lockScreen()`.

## Files to Modify

- `main.js` — wire `arm`/`cancel` handlers, attach webContents, remove inline lock logic.
- `preload.js` — replace `lock` with `arm`/`cancel`/`onArmedState`.
- `renderer/button.js` — drop local timer; call `arm`/`cancel`; drive visuals from `onArmedState`.

## Files Unchanged

- `renderer/index.html` — markup reused as-is.
- `renderer/style.css` — `.armed`/ring styles reused as-is.
- `store.js` — no persistence changes.

## Tests

No automated test framework in the project (per `.specs-fire/standards/testing-standards.md`). Verification is manual smoke test via `bun start`:
- Short click arms the button (pulse + ring) and locks after 2s.
- A second short click during the 2s window cancels (no lock).
- Drag still repositions the button and position persists across restarts.
- No console errors in the renderer DevTools or main process.

## IPC Contract Change (for PR description)

- Removed: `lock-screen` invoke handler; `window.sirenGuard.lock()`.
- Added: `arm` invoke handler → `window.sirenGuard.arm()`; `cancel` invoke handler → `window.sirenGuard.cancel()`; `armed-state` main→renderer event → `window.sirenGuard.onArmedState(cb)`.
