# Walkthrough: batch run-sirenguard-2026-003

- **Run**: run-sirenguard-2026-003 (batch, 3 work items, all confirm mode)
- **Intent**: triggers-and-settings

## Overview

This run implemented the three remaining work items of the "Multiple trigger types and settings screen" intent: the idle-timer trigger, the app-detection trigger, and the settings window. Both triggers reuse the shared `lock-orchestration` arm/cancel state machine from run-002, so they get the same 2-second cancel window as the manual button for free. The settings window provides a UI to enable/configure each trigger and pick flagged apps.

## Work Item 1: idle-timer-trigger

### Files
- `idle-trigger.js` (new) — polls system idle time every 5s via `ioreg -c IOHIDSystem`; arms when idle >= threshold, auto-cancels when the user becomes active during the cancel window.
- `lock-orchestration.js` (modified) — added `isArmed()` so the idle trigger won't double-arm over a manual click.
- `main.js` (modified) — `idleTrigger.start()` in `whenReady`, `stop()` in `will-quit`.

### How it works
Every 5s the trigger reads `getIdleTrigger()` (live-apply), queries `ioreg` for `HIDIdleTime` (nanoseconds → seconds), and:
- If idle >= threshold and nothing is armed → `lockOrchestration.arm()` (sets `weArmed`).
- If idle drops below threshold and we armed → `lockOrchestration.cancel()` (auto-cancel on activity).

### Verification
`ioreg` parse verified against real output (207s). Boot smoke clean. Interactive firing pending GUI.

## Work Item 2: app-detection-trigger

### Files
- `app-detection-trigger.js` (new) — polls the frontmost app every 5s via `osascript`; arms after a flagged app has been frontmost for the configured delay; switches away reset the timer / cancel.
- `main.js` (modified) — `appDetectionTrigger.start()` / `stop()`.

### How it works
Every 5s: reads `getAppDetectionTrigger()`, fetches frontmost `{name, bundleId}` via two `osascript` queries, and checks `isFlagged` (name case-insensitive OR bundleId exact). If flagged, tracks `flaggedSinceMs`; once `delaySec` elapses and nothing is armed → `arm()`. If not flagged → reset timer, and cancel if we had armed.

### Verification
Frontmost fetch + `isFlagged` matching verified standalone (matched "Cursor" by both name and bundleId). Boot smoke clean. Interactive firing pending GUI.

## Work Item 3: settings-window

### Files
- `settings-preload.js` (new) — `contextBridge` exposing `window.sirenGuardSettings`: `getTriggerConfig`, `setTriggerConfig`, `getRunningApps` (minimal surface — no lock APIs).
- `renderer/settings.html`, `renderer/settings.css`, `renderer/settings.js` (new) — hand-rolled settings UI.
- `main.js` (modified) — `createSettingsWindow()` (single instance, focus-if-open), IPC handlers `get-trigger-config` / `set-trigger-config` / `get-running-apps`, `getRunningApps()` helper (osascript, zips name+bundleId), "Settings..." tray menu item.

### How it works
Tray "Settings..." opens a normal 380x560 window. On load it fetches config + running apps in parallel. The UI shows an idle toggle + threshold and an app-detection toggle + delay + flagged-apps list. Flagged apps can be added from a running-apps dropdown or via manual name/bundleId entry; each entry has a Remove button. Save builds the config object and calls `setTriggerConfig`; triggers pick up changes on their next poll (live-apply, no restart).

### Verification
Self-test opened the settings window on boot with a console listener: renderer loaded with no JS errors (only the standard Electron CSP warning), IPC round-trips ran without throwing, app quit cleanly. Temp code reverted; final boot clean. Interactive flows pending GUI.

## Cross-cutting notes

- **Environment gotcha**: `ELECTRON_RUN_AS_NODE=1` is set by Cursor's CLI in the shell, which makes `bun start` crash (Electron runs as pure Node, `app` undefined). Run smoke tests with `env -u ELECTRON_RUN_AS_NODE bun start`. Not a code issue.
- **Live-apply**: both triggers read config on every tick, so settings changes take effect within one 5s poll interval with no restart.
- **Shared cancel window**: all three trigger sources (manual click, idle, app-detection) route through `lockOrchestration.arm()`/`cancel()`, so the 2s cancel/undo behavior is identical everywhere.
- **No new dependencies**: all OS queries use built-in `child_process` shelling out to `ioreg` and `osascript`.

## IPC contract changes (for PR)

- New main handlers: `get-trigger-config`, `set-trigger-config`, `get-running-apps`.
- New `settings-preload.js` exposing `window.sirenGuardSettings` (separate from `window.sirenGuard`).
- `lock-orchestration.js` added `isArmed()` (additive).

## Pending human verification

All interactive behaviors (click→arm→lock, click→cancel, drag persist, idle→arm, activity→cancel, app-detection→arm, switch-away→cancel, settings open/persist/live-apply) are pending manual confirmation via `env -u ELECTRON_RUN_AS_NODE bun start` since they require GUI interaction.
