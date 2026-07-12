---
id: triggers-schema-migrate
title: Triggers schema migrate to array
intent: dashboard-settings-window
complexity: high
mode: validate
status: completed
depends_on:
  - settings-store-expand
created: 2026-07-12T00:31:00-07:00
run_id: run-sirenguard-002
completed_at: 2026-07-12T07:41:04.074Z
---

# Work Item: Triggers schema migrate to array

## Description

Migrate the persisted trigger config from the current object shape

```
triggers: { idle: { enabled, thresholdSec }, appDetection: { enabled, delaySec, flaggedApps } }
```

to the spec's array shape

```
triggers: [
  { id: 'idle', name: 'Idle-timer', enabled, thresholdSec },
  { id: 'app-detection', name: 'App-detection', enabled, delaySec, flaggedApps }
]
```

Includes a one-time, idempotent migration of existing user data: on startup, detect the old object shape and convert it to the array shape, persisting the result. Update all readers: `idle-trigger.js`, `app-detection-trigger.js`, and the `getTriggerConfig` / `setTriggerConfig` accessors in `store.js`. The dashboard Triggers section (work item `dashboard-triggers-section`) will consume this shape.

**High complexity → requires an approved design doc (Checkpoint 1) before implementation.** Key decisions to capture in the design doc: migration detection heuristic, idempotency, handling of partial/corrupt data, how readers locate a trigger by `id`, and whether `setTriggerConfig` replaces the whole array or merges by `id`.

## Acceptance Criteria

- [x] Design doc approved at `work-items/triggers-schema-migrate-design.md` before implementation begins.
- [ ] New persisted shape is `triggers: [{id, name, enabled, ...config}]` with `idle` and `app-detection` entries.
- [ ] On startup with an existing old-shape store, data is migrated to the array shape and persisted exactly once (re-launch does not re-migrate or duplicate).
- [ ] `idle-trigger.js` reads `triggers.idle` equivalent correctly from the array (by `id`).
- [ ] `app-detection-trigger.js` reads `triggers.app-detection` equivalent correctly from the array (by `id`), including `flaggedApps`.
- [ ] `getTriggerConfig` returns the array; `setTriggerConfig` writes the array per the design decision.
- [ ] Idle and app-detection triggers still fire/lock correctly after migration (manual smoke test).
- [ ] No new dependencies.

## Technical Notes

Migration must be defensive: if `triggers` is already an array, skip; if it's an object with `idle`/`appDetection`, convert; if it's missing or unrecognized, fall back to defaults. Readers should locate entries by `id` rather than index to stay robust. Coordinate with `settings-ipc-refactor` (work item 4) which will re-expose trigger config via `settings:get` / `settings:update`.

## Dependencies

- settings-store-expand
