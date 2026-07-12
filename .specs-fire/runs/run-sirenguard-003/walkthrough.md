# Walkthrough: Run C (batch)

**Run**: run-sirenguard-003  
**Work items**: cancel-window-wiring, settings-ipc-refactor

## cancel-window-wiring

`lock-orchestration.js` now reads `cancelWindowSeconds` from the store when `arm()` is called. The timeout is `seconds * 1000`, with a 2000ms fallback if the value is invalid. Mid-arm timer is never rescheduled — changing settings during an active arm only affects the next arm.

## settings-ipc-refactor

### New store helpers (`store.js`)

- `getAllSettings()` — full settings snapshot
- `updateSettings(partial)` — deep-merge top-level keys; triggers merged by `id`
- `resetSettings()` — `store.clear()` back to defaults

### New IPC (`main.js`)

| Channel | Behavior |
|---------|----------|
| `settings:get` | Returns full settings object |
| `settings:update` | Merges partial, persists, broadcasts `settings:changed` |
| `button:reset-position` | Moves floating window to default (100, 100) |
| `settings:reset` | Clears store to defaults, repositions window, refreshes tray menu |

`broadcastSettingsChanged()` sends to both floating and settings windows.

### Preload updates

- `settings-preload.js`: `getSettings`, `updateSettings`, `resetButtonPosition`, `resetSettings`, `onSettingsChanged` (+ legacy shims)
- `preload.js`: `onSettingsChanged` for floating button window

## Next

**Run D (autopilot)**: `dashboard-shell` (depends on settings-ipc-refactor — now complete)

Then remaining confirm dashboard sections.

Re-invoke `/specsmd-fire-builder` to continue.
