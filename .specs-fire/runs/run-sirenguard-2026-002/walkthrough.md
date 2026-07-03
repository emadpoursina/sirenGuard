# Walkthrough: lock-orchestration

- **Work item**: lock-orchestration
- **Run**: run-sirenguard-2026-002
- **Intent**: triggers-and-settings

## What changed and why

v1 owned the 2-second arm/cancel countdown entirely in the renderer (`renderer/button.js`), which called `window.sirenGuard.lock()` on timeout. That model only supports a manual click. To add automatic triggers (idle-timer, app-detection), the countdown had to move to the main process so any trigger can initiate the same cancel window. This work item refactored the lock flow into a shared main-process state machine without changing end-user behavior.

## Files

- `lock-orchestration.js` (new) — owns `attach`, `arm`, `cancel`, the 2s `setTimeout`, and the `open -a ScreenSaverEngine` exec. Emits `armed-state` events to the attached floating window's `webContents`.
- `main.js` — removed inline `LOCK_COMMAND`/`lockScreen`/`exec`; `require`s the orchestration module; registers `arm` and `cancel` IPC handlers (replacing `lock-screen`); calls `lockOrchestration.attach(floatingWindow.webContents)` after window creation.
- `preload.js` — replaced `lock()` with `arm()`, `cancel()`, and `onArmedState(cb)` (wraps `ipcRenderer.on('armed-state')`).
- `renderer/button.js` — dropped the local `setTimeout` countdown; tracks an `armed` boolean driven by `onArmedState`; on a short click calls `arm()` when idle or `cancel()` when armed. Drag-vs-click threshold preserved.

## How it works now

1. User short-clicks the floating button → `window.sirenGuard.arm()` → IPC `arm` → `lockOrchestration.arm()` clears any prior timer, emits `armed:true`, starts a 2s timer.
2. Renderer receives `armed-state { armed: true }` → adds `.armed` class, shows the countdown ring.
3. On timeout → main emits `armed:false` and execs `open -a ScreenSaverEngine` (screen locks).
4. If the user clicks again within 2s → `window.sirenGuard.cancel()` → `lockOrchestration.cancel()` clears the timer and emits `armed:false` (no lock).

## IPC contract change (note for PR)

- Removed: `lock-screen` invoke handler; `window.sirenGuard.lock()`.
- Added: `arm` / `cancel` invoke handlers; `armed-state` main→renderer event; `window.sirenGuard.arm()`, `.cancel()`, `.onArmedState(cb)`.

## Verification done

- Static: `node --check` on all four files; ReadLints clean.
- Startup: `bun start` boots with no errors in ~6s run; no lingering process.
- Pending: interactive GUI confirmation (click→arm→lock, click→cancel, drag persistence) — not automatable here.

## Downstream impact

`lock-orchestration` is now the single entry point for triggering a lock. The upcoming `idle-timer-trigger` and `app-detection-trigger` work items will `require('./lock-orchestration')` and call `arm()` directly from the main process — no IPC needed for triggers, and the same 2s cancel window applies automatically.
