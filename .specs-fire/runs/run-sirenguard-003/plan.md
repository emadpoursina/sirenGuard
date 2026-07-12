---
run: run-sirenguard-003
work_item: cancel-window-wiring, settings-ipc-refactor
intent: dashboard-settings-window
mode: confirm (batch)
checkpoint: plan
approved_at: 2026-07-12T07:44:00Z
---

# Implementation Plan: Run C (batch)

## Work Item: cancel-window-wiring

### Approach

Import `getCancelWindowSeconds` in `lock-orchestration.js` and read it inside `arm()` to set the timeout duration. Remove hardcoded `CANCEL_WINDOW_MS`. Timer duration is fixed at arm time — a `settings:changed` during an active arm does not reschedule the running timer.

### Files to Modify

| File | Changes |
|------|---------|
| `lock-orchestration.js` | Read `cancelWindowSeconds * 1000` at arm time; fallback 2000ms if invalid |

---

## Work Item: settings-ipc-refactor

### Approach

Add `getAllSettings`, `updateSettings`, `resetSettings` to `store.js`. Add IPC handlers in `main.js` with `broadcastSettingsChanged`. Expose new API + `onSettingsChanged` in `settings-preload.js` and `preload.js`. Keep legacy trigger config shims.

### Files to Modify

| File | Changes |
|------|---------|
| `store.js` | `getAllSettings`, `updateSettings`, `resetSettings` |
| `main.js` | `settings:get`, `settings:update`, `button:reset-position`, `settings:reset`, broadcast helper |
| `settings-preload.js` | New settings API + listener |
| `preload.js` | `onSettingsChanged` listener for floating window |

---
*Plan approved. Execution follows.*
