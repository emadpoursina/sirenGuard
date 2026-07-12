---
id: settings-ipc-refactor
title: Settings IPC refactor
intent: dashboard-settings-window
complexity: medium
mode: confirm
status: completed
depends_on:
  - triggers-schema-migrate
created: 2026-07-12T00:31:00-07:00
run_id: run-sirenguard-003
completed_at: 2026-07-12T07:45:11.249Z
---

# Work Item: Settings IPC refactor

## Description

Implement the IPC shape proposed in `scratch/dashboard-spec.md` and expose it to the settings renderer via `settings-preload.js`. Replace the narrow `get-trigger-config` / `set-trigger-config` handlers with a unified settings API.

New handlers in `main.js` `registerIpcHandlers`:
- `settings:get` → returns the full settings object (button position, launchAtLogin, startMinimized, cancelWindowSeconds, buttonOpacity, buttonColor, triggers).
- `settings:update` (partial object) → deep-merges into the store, persists, then broadcasts `settings:changed` to both the floating window and the settings window via `webContents.send`.
- `button:reset-position` → repositions the floating window to the default position, updates the store, and broadcasts `settings:changed`.
- `settings:reset` → restores store defaults (keep migration-safe triggers shape), broadcasts `settings:changed`.

Update `settings-preload.js` to expose `getSettings`, `updateSettings`, `resetButtonPosition`, `resetSettings`. Retire the old `get-trigger-config` / `set-trigger-config` handlers only after the dashboard sections migrate to the new API; if any caller remains, keep a thin shim for this run and remove in a follow-up.

## Acceptance Criteria

- [ ] `settings:get` returns the full settings object including all keys from `settings-store-expand` and the migrated `triggers` array.
- [ ] `settings:update` merges a partial object, persists, and sends `settings:changed` to both windows.
- [ ] `button:reset-position` moves the floating window to the default position and updates the store.
- [ ] `settings:reset` restores defaults and broadcasts `settings:changed`.
- [ ] `settings-preload.js` exposes the four new methods on `window.sirenGuardSettings`.
- [ ] Legacy `get-trigger-config` / `set-trigger-config` either removed or left as a documented shim; no dead handlers.
- [ ] Manual smoke: update a setting from the console via the new API and observe `settings:changed` in both windows.

## Technical Notes

Broadcast helper: iterate `[floatingWindow, settingsWindow]`, skip destroyed/null windows, `webContents.send('settings:changed', fullSettings)`. The floating button renderer and each dashboard section subscribe to `settings:changed` in their own work items. Keep `contextIsolation: true` / `nodeIntegration: false` unchanged.

## Dependencies

- triggers-schema-migrate
