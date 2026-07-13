---
run: run-sirenguard-008
scope: batch
mode: confirm
---

# Implementation Plan: Batch B (confirm)

## 1. app-consequence-action
- Add `arm({ suppressCancel: true })` to lock-orchestration
- Shared `re-entry-block.js` registry helper
- `app-consequence-action.js`: quit/kill app, register block
- Extend `app-detection-trigger.js`: block check → instant arm

## 2. website-consequence-action
- `website-consequence-action.js`: request tab close + register block
- `website-server.js`: GET/POST `/close-tab` for extension handshake
- Extend `website-detection-trigger.js`: block check → instant arm
- Extension: poll `/close-tab`, close active tab

## 3. disable-quit-friction
- Store `overrideUntil`; `isTriggersSuspended()` helper
- `friction-gate.js` + friction renderer window
- IPC `friction:request` / `friction:confirm`; gate tray quit + override
- Short-circuit triggers when suspended

## 4. dashboard-reminder-section
- `renderer/sections/reminder.js` + settings.html wiring
- IPC `reminder:upload` for media bytes to userData

## 5. floating-button-drag-fix
- IPC `set-position`; JS drag in `renderer/button.js`
- Remove conflicting `-webkit-app-region: drag`
