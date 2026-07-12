---
id: trigger-config-store
title: Trigger config store
intent: triggers-and-settings
complexity: low
mode: autopilot
status: completed
depends_on: []
created: 2026-07-03T07:39:00-07:00
run_id: run-sirenguard-2026-001
completed_at: 2026-07-03T07:42:00-07:00
---

# Work Item: Trigger config store

## Description

Extend `store.js` with a trigger-configuration schema and typed getters/setters so triggers and the settings window can read/write a single source of truth. Schema includes per-trigger enabled flags, idle threshold (seconds), app-detection delay (seconds), and the flagged-apps list (app names and/or bundle IDs).

## Acceptance Criteria

- [ ] `store.js` defaults include a `triggers` object: `{ idle: { enabled, thresholdSec }, appDetection: { enabled, delaySec, flaggedApps: [] } }`.
- [ ] Getters/setters exist for each trigger's enabled flag, threshold/delay, and the flagged-apps list (add/remove/replace).
- [ ] Existing `buttonPosition` and `launchAtLogin` keys are untouched.
- [ ] No new dependencies; plain JS; surgical edits to `store.js` only.

## Technical Notes

- Flagged-apps entries should accommodate both display names and bundle IDs — store as objects `{ name?, bundleId? }` or strings; pick one and stay consistent.
- Keep accessor naming consistent with existing `getButtonPosition`/`setButtonPosition` style.

## Dependencies

(none)
