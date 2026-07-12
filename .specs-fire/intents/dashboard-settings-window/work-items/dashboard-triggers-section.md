---
id: dashboard-triggers-section
title: Dashboard Triggers section
intent: dashboard-settings-window
complexity: medium
mode: confirm
status: completed
depends_on:
  - dashboard-shell
  - triggers-schema-migrate
created: 2026-07-12T00:31:00-07:00
run_id: run-sirenguard-005
completed_at: 2026-07-12T07:49:17.851Z
---

# Work Item: Dashboard Triggers section

## Description

Build the Triggers section of the dashboard, folding in the existing idle-timer and app-detection editing (no regression) and adding a read-only Manual Click row per spec §3:
- **Manual Click → Lock** — read-only row (name, a non-interactive enabled indicator, brief description). Always on; no controls.
- **Idle-timer trigger** — enabled toggle + threshold (seconds) input. Migrated from current `settings.js`.
- **App-detection trigger** — enabled toggle + delay (seconds) input + flagged-apps list (add from running apps, add manually, remove). Migrated from current `settings.js`.
- **Add trigger** button — disabled/greyed with a "coming soon" label.

All editable rows read/write through the new `settings:get` / `settings:update` API against the migrated `triggers` array shape (each entry located by `id`). The existing `getRunningApps` IPC is reused for the "add from running apps" dropdown.

## Acceptance Criteria

- [ ] Triggers section shows the read-only Manual Click row plus editable Idle and App-detection rows.
- [ ] Idle toggle + threshold persist and the idle trigger reflects the change (manual smoke).
- [ ] App-detection toggle + delay + flagged-apps list persist and behave as today (add from running, add manual, remove).
- [ ] "Add trigger" control is visibly disabled with a "coming soon" label.
- [ ] All writes go through `updateSettings` (no remaining calls to the legacy `setTriggerConfig`).
- [ ] Reopening the dashboard shows persisted trigger state.

## Technical Notes

Migrate the flagged-app rendering logic out of the current `settings.js` into the Triggers section. Because the store shape is now an array, the section code locates the `idle` and `app-detection` entries by `id` and writes back the full array via `updateSettings({ triggers })`. Keep the existing CSS classes for the flagged-app list where possible to minimize restyle.

## Dependencies

- dashboard-shell
- triggers-schema-migrate
