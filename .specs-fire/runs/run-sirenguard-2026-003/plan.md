# Implementation Plan (batch run-sirenguard-2026-003)

This plan.md accumulates a section per work item as the batch progresses.

---

## Work Item: idle-timer-trigger

- **Mode**: confirm (1 checkpoint: this plan approval)
- **Dependencies**: lock-orchestration ✅, trigger-config-store ✅

### Approach

Add a new main-process module `idle-trigger.js` that polls macOS system idle time every 5s. When idle crosses the configured threshold, it calls `lockOrchestration.arm()` (reusing the shared 2s cancel window). When the user becomes active again during the cancel window, it calls `lockOrchestration.cancel()` to avoid locking the screen the moment they return (per user decision). The trigger reads config on every tick (live-apply: enable/disable and threshold changes take effect within one poll interval, no restart).

To avoid the idle trigger stepping on a manual arm in progress, `lock-orchestration.js` gets a small additive `isArmed()` query so the idle trigger only arms when nothing else is already armed.

Idle time is obtained with no new dependencies by shelling out to `ioreg -c IOHIDSystem` and parsing `HIDIdleTime` (nanoseconds → seconds).

### Files to Create

- `idle-trigger.js` — polling idle-time trigger; `start()` / `stop()`; reads `getIdleTrigger()` each tick.

### Files to Modify

- `lock-orchestration.js` — add `isArmed()` (returns `timer !== null`); export it. Additive only, no behavior change to existing arm/cancel.
- `main.js` — `require('./idle-trigger')`; call `idleTrigger.start()` in `app.whenReady()`; call `idleTrigger.stop()` on `app.on('will-quit')`.

### Files Unchanged

- `preload.js`, `renderer/*`, `store.js` — no changes.

### Behavior spec

- Poll interval: 5000ms.
- Each tick:
  - Read `getIdleTrigger()` → `{ enabled, thresholdSec }`.
  - If `enabled === false`: if we armed, cancel and clear `weArmed`; return.
  - Read idle seconds via `ioreg`.
  - If `idle >= thresholdSec` and `!weArmed` and `!lockOrchestration.isArmed()`: `arm()`; `weArmed = true`.
  - Else if `idle < thresholdSec` and `weArmed`: `cancel()`; `weArmed = false` (auto-cancel on activity).
- `stop()` clears the interval and resets `weArmed`.

### Tests

No automated framework. Manual smoke via `bun start`:
- Set idle threshold low (e.g. 5s) via config; leave machine idle → button arms after ~5s, locks after 2s.
- During the 2s window, move the mouse → arm cancels, no lock.
- Disable trigger via config → no arming on idle.
- Manual click still works and isn't double-armed by the idle trigger.

### Risks

- `ioreg` parsing: `HIDIdleTime` is in nanoseconds; integer parse + `/1e9`. If `ioreg` output format varies across macOS versions, parse defensively (regex for digits on the HIDIdleTime line).
- Polling overhead: one `ioreg` exec every 5s is negligible.
- Edge case: after a lock fires, `weArmed` stays true until user activity resets it; the follow-up `cancel()` is a harmless no-op (no timer, emits armed=false to an already-idle renderer).

---

## Work Item: app-detection-trigger

- **Mode**: confirm (1 checkpoint: this plan approval)
- **Dependencies**: lock-orchestration ✅, trigger-config-store ✅

### Approach

New main-process module `app-detection-trigger.js` that polls the frontmost macOS app every 5s via `osascript` (no new deps). When a flagged app is frontmost, it tracks how long it has been frontmost; once the configured delay elapses, it calls `lockOrchestration.arm()` (reusing the shared 2s cancel window). Switching away from a flagged app resets the timer; if it switches away during the 2s cancel window, it cancels (consistent with the idle trigger's auto-cancel-on-activity behavior). Config is read each tick (live-apply).

Flagged-app matching tolerates both display name (case-insensitive) and bundle id (exact), matching the `{name?, bundleId?}` shape stored by `trigger-config-store`.

Frontmost detection uses two `osascript` queries (name, then bundle identifier), both best-effort. Verified on this machine: both return values with no permission prompt.

### Files to Create

- `app-detection-trigger.js` — `start()` / `stop()`; reads `getAppDetectionTrigger()` each tick; tracks `flaggedSinceMs` and `weArmed`.

### Files to Modify

- `main.js` — `require('./app-detection-trigger')`; call `start()` in `whenReady()`, `stop()` in `will-quit` (alongside `idleTrigger.stop()`).

### Files Unchanged

- `lock-orchestration.js` (already has `isArmed()` from the idle item), `preload.js`, `renderer/*`, `store.js`.

### Behavior spec

- Poll interval: 5000ms.
- Each tick:
  - Read `getAppDetectionTrigger()` → `{ enabled, delaySec, flaggedApps }`.
  - If disabled: if armed, cancel + reset; return.
  - Get frontmost `{ name, bundleId }`.
  - `isFlagged = flaggedApps.some(a => (a.name && a.name.toLowerCase() === name?.toLowerCase()) || (a.bundleId && a.bundleId === bundleId))`.
  - If `isFlagged`:
    - If `flaggedSinceMs === null`: set to `Date.now()`.
    - If `Date.now() - flaggedSinceMs >= delaySec*1000` and `!weArmed` and `!lockOrchestration.isArmed()`: `arm()`; `weArmed = true`.
  - Else:
    - `flaggedSinceMs = null`.
    - If `weArmed`: `cancel()`; `weArmed = false`.
- `stop()` clears interval, resets `weArmed` and `flaggedSinceMs`.

### Tests

No automated framework. Manual smoke via `bun start` (with `ELECTRON_RUN_AS_NODE` unset):
- Flag the current frontmost app (e.g. "Cursor") with a low delay (e.g. 5s); keep it frontmost → button arms after ~5s, locks after 2s.
- Switch away before the delay → no arm.
- Switch away during the 2s cancel window → cancel, no lock.
- Disable trigger or remove the flagged app → no arming (live-apply).

### Risks

- `osascript` may prompt for Automation permission on some macOS configurations; if so, document it. Verified no prompt here.
- Polling overhead: two `osascript` calls every 5s — negligible.
- Process-name matching flags whole apps (e.g. a browser), not specific websites — matches v1 scope ("app-detection for specific apps"). URL/site-level detection is out of scope.

---

## Work Item: settings-window

- **Mode**: confirm (1 checkpoint: this plan approval)
- **Dependencies**: trigger-config-store ✅

### Approach

Add a separate settings `BrowserWindow` (normal, non-floating) opened from a new "Settings..." tray menu item. Built as plain HTML/CSS/JS with a dedicated `settings-preload.js` (minimal surface — only settings IPC, not the lock APIs). Reads/writes trigger config via new IPC against `trigger-config-store`; changes apply live because the trigger modules already read config on each poll cycle. Flagged-app picker offers both "pick from currently-running apps" and manual name/bundleId entry, matching the `{name?, bundleId?}` store shape.

Running-apps list is fetched via two `osascript` queries (name + bundle identifier of every process whose `background only is false`), zipped into `[{name, bundleId}]`. Verified on this machine.

### Files to Create

- `settings-preload.js` — `contextBridge` exposing `window.sirenGuardSettings`: `getTriggerConfig()`, `setTriggerConfig(config)`, `getRunningApps()`.
- `renderer/settings.html` — settings form markup.
- `renderer/settings.css` — settings styles (separate from floating-button CSS).
- `renderer/settings.js` — load config on open, render idle + app-detection sections, flagged-app picker (running-apps dropdown + manual entry), save.

### Files to Modify

- `main.js` — `createSettingsWindow()` (single instance, focus if open), IPC handlers `get-trigger-config` / `set-trigger-config` / `get-running-apps`, "Settings..." tray menu item above the existing separator. `getRunningApps()` shells out to `osascript` and zips name+bundleId lists.

### Files Unchanged

- `preload.js` (floating window keeps its own surface), `store.js`, `lock-orchestration.js`, trigger modules.

### Behavior spec

- Tray menu order: "Settings..." → separator → "Launch at Login" → separator → "Quit" (Settings placed at top).
- Settings window: `frame: true`, `resizable: false`, ~380x560, `webPreferences: { preload: settings-preload.js, contextIsolation: true, nodeIntegration: false }`.
- On load: call `getTriggerConfig()`, populate:
  - Idle: enabled checkbox + thresholdSec number input.
  - App-detection: enabled checkbox + delaySec number input + flagged-apps list.
- Flagged-apps list: each row shows `name (bundleId)` with a remove button. Add via:
  - A `<select>` populated from `getRunningApps()` (choose an app → adds `{name, bundleId}`).
  - Manual: two text inputs (name, bundleId) + Add button → adds `{name, bundleId}` (at least one required).
- Save button → build `{ idle: {enabled, thresholdSec}, appDetection: {enabled, delaySec, flaggedApps} }` → `setTriggerConfig(config)`. Show a small "Saved" indicator.
- Closing the window just hides/destroys it; re-opening from tray recreates it.
- Live-apply: no restart needed (triggers read config each tick).

### IPC contract change (for PR)

- Added main handlers: `get-trigger-config`, `set-trigger-config`, `get-running-apps`.
- Added `settings-preload.js` exposing `window.sirenGuardSettings` (separate from `window.sirenGuard`).

### Tests

No automated framework. Manual smoke via `bun start` (env var unset):
- Tray "Settings..." opens the window once; clicking again focuses the existing window.
- Toggles and inputs reflect saved config; saving persists across app restart.
- Enabling idle with a low threshold → leaving machine idle arms/locks (confirms live-apply).
- Adding a flagged app from the running-apps dropdown → with a low delay, focusing that app arms/locks.
- Removing a flagged app or disabling a trigger stops arming without restart.
- Floating button and Launch-at-Login still work unchanged.

### Risks

- App names containing commas would break the `, ` split. Unlikely for process names; acceptable for v1. Documented.
- `osascript` Automation permission may prompt on some configs (none here).
- Exposing a separate preload keeps the settings renderer from touching lock IPC — minimal surface maintained.
