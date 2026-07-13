---
id: dashboard-reminder-section
title: Dashboard Reminder section
intent: break-the-loop
complexity: medium
mode: confirm
status: pending
depends_on:
  - break-the-loop-store
created: 2026-07-13T10:51:00-07:00
---

# Work Item: Dashboard Reminder section

## Description

Add a new "Reminder" section to the existing dashboard (reusing the dashboard shell and section registration pattern from `renderer/sections/*.js`). The section lets the user:

- Upload a reminder image or short video (≤ ~30 s) and store it under the resolved `userData` reminder-media directory; show a preview.
- Set/edit the caption.
- Pick the "safe app" for the idle trigger (reuse the running-app picker pattern from the existing app-detection section, or manual name/bundle id entry).
- Set the `confirmationPhrase` used by the friction gate.
- View the `overrideLog` (most recent entries) with timestamps and kinds.

All changes persist via the existing `updateSettings` flow (`window.dashboard.updateSettings` / `window.sirenGuardSettings.*`). No new settings values beyond what `break-the-loop-store` already defines.

## Acceptance Criteria

- [ ] A new "Reminder" section appears in the dashboard and registers via the existing `registerSection` mechanism
- [ ] Image/video upload writes the file to the reminder-media directory and updates `reminder.mediaType`/`mediaPath`; oversized videos (> ~30 s) are rejected with a clear message
- [ ] Caption edits persist to `reminder.caption`
- [ ] Safe-app selection persists to `safeApp` (name + bundle id)
- [ ] Confirmation phrase entry persists to `confirmationPhrase`; an empty phrase shows guidance that friction requires a phrase
- [ ] Override log is displayed read-only with timestamps and kinds
- [ ] Live updates apply without app restart (existing `settings:changed` broadcast)
- [ ] Plain HTML/CSS/JS matching existing dashboard section style; no new dependencies
- [ ] Unit/contract tests cover section registration and the settings round-trip for each field

## Technical Notes

Reuse the existing running-app picker and section scaffolding to minimize new patterns. The upload needs a new IPC to write file bytes to `userData` (do not pass file system access to the renderer); keep it scoped to the reminder-media directory and validate MIME type + size/duration. Coordinate with `disable-quit-friction` so the phrase set here is what the gate checks. Surgical edits; match existing indentation and naming.

## Dependencies

- break-the-loop-store
