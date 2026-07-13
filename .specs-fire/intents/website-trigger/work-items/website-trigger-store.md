---
id: website-trigger-store
title: Website trigger store schema
intent: website-trigger
complexity: low
mode: autopilot
status: completed
depends_on: []
created: 2026-07-12T05:37:00-07:00
run_id: run-sirenguard-006
completed_at: 2026-07-12T13:06:13.131Z
---

# Work Item: Website trigger store schema

## Description

Add a `website-detection` trigger entry to the persisted `triggers` array in `store.js`, mirroring the existing `app-detection` entry pattern. The entry holds an `enabled` flag, a `delaySec` arm-delay, and a `targets` array of hostname/pattern strings (supporting `*.domain` wildcards). Provide getters/setters and extend `migrateTriggersSchema` so existing installs receive the new entry with safe defaults.

## Acceptance Criteria

- [ ] `defaultTriggersArray()` in `store.js` includes a `website-detection` entry: `{ id: 'website-detection', name: 'Website-detection', enabled: false, delaySec: 10, targets: [] }`
- [ ] `getWebsiteDetectionTrigger()` / `setWebsiteDetectionTrigger(config)` accessors exist and use the shared `getTriggerById`/`setTriggerById` helpers
- [ ] `getWebsiteTargets()` / `setWebsiteTargets(targets)` helpers exist (parallel to `getFlaggedApps`/`setFlaggedApps`)
- [ ] `migrateTriggersSchema` preserves the existing array-merge behavior and appends a default `website-detection` entry when one is missing from an already-array `triggers` value (without duplicating it on re-run)
- [ ] `getAllSettings()` continues to return the full `triggers` array including the new entry
- [ ] No external dependencies added; plain JS; surgical edits only

## Technical Notes

Match the field naming and indentation of the existing `app-detection` entry exactly. The `targets` array stores raw strings (e.g. `"instagram.com"`, `"*.youtube.com"`); matching logic itself lives in the browser extension and the detection trigger module, not here.

## Dependencies

(none)
