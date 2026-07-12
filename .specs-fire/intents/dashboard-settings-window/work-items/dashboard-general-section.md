---
id: dashboard-general-section
title: Dashboard General section
intent: dashboard-settings-window
complexity: medium
mode: confirm
status: completed
depends_on:
  - dashboard-shell
created: 2026-07-12T00:31:00-07:00
run_id: run-sirenguard-005
completed_at: 2026-07-12T07:49:17.524Z
---

# Work Item: Dashboard General section

## Description

Build the General section of the dashboard:
- **Launch at login** toggle — maps to `app.setLoginItemSettings({ openAtLogin, openAsHidden })`. Must stay in sync with the existing tray "Launch at Login" checkbox: toggling either updates the other. Reuse `applyLaunchAtLogin` / `getLaunchAtLoginState` in `main.js`.
- **Start minimized to tray** toggle — persists `startMinimized`. (Startup behavior wiring: when `startMinimized` is true and the app launches, the floating window is created but hidden until the tray is clicked; if false, the floating window shows as today. Confirm exact reveal behavior at the plan checkpoint.)

Both toggles write through `updateSettings` and persist. The Launch-at-login toggle calls a dedicated IPC (e.g. `settings:set-launch-at-login`) because it has a side effect on the OS, not just the store.

## Acceptance Criteria

- [ ] General section renders both toggles with correct initial values from `settings:get`.
- [ ] Toggling Launch at login calls the OS API and updates the store; the tray checkbox reflects the new state on next menu open.
- [ ] Toggling Start minimized persists `startMinimized` and the app respects it on next launch.
- [ ] Toggling either control in the tray vs. the dashboard keeps both in sync.
- [ ] In dev (`!app.isPackaged`), Launch at login toggle is disabled with the same behavior as the tray checkbox today (or shown but no-op) — confirm choice at checkpoint.

## Technical Notes

Tray menu is rebuilt via `buildTrayMenu()`; call `tray.setContextMenu(buildTrayMenu())` after a launch-at-login change from the dashboard so the checkbox stays in sync. Avoid duplicating the login-item logic — reuse the existing functions in `main.js`.

## Dependencies

- dashboard-shell
