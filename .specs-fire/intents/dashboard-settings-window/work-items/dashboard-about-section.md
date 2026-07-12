---
id: dashboard-about-section
title: Dashboard About / Data section
intent: dashboard-settings-window
complexity: low
mode: autopilot
status: completed
depends_on:
  - dashboard-shell
created: 2026-07-12T00:31:00-07:00
run_id: run-sirenguard-005
completed_at: 2026-07-12T07:49:18.028Z
---

# Work Item: Dashboard About / Data section

## Description

Build the About / Data section of the dashboard:
- **App version** — displayed as read-only text, sourced from `app.getVersion()` via an IPC (e.g. `settings:get-meta` returning `{ version }`) or included in `settings:get`.
- **Reset all settings to default** — button that shows a plain confirm dialog (`electron`'s `showMessageBox` or a renderer confirm), then calls `resetSettings`. Keep triggers in their migrated array shape after reset (defaults must match the new schema).
- **Local settings file location** — the `electron-store` file path shown as text; clicking it reveals the file in Finder via `shell.showItemInFolder`.

## Acceptance Criteria

- [ ] App version is shown and matches `package.json` / `app.getVersion()`.
- [ ] "Reset all settings to default" shows a confirm dialog and, on confirm, restores defaults (including triggers array shape) and broadcasts `settings:changed`; the dashboard reflects reset values.
- [ ] Settings file path is shown; clicking it opens Finder with the file highlighted.
- [ ] No new dependencies.

## Technical Notes

`electron-store` writes to `app.getPath('userData')/config.json` by default; expose the actual path via the store instance's `.path` property through an IPC rather than hardcoding the filename. `shell.showItemInFolder` requires the path to exist — the store file exists after first write, which is guaranteed by app startup.

## Dependencies

- dashboard-shell
