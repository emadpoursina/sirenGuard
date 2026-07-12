---
run: run-sirenguard-002
work_item: triggers-schema-migrate
intent: dashboard-settings-window
mode: validate
checkpoint: plan
approved_at: 2026-07-12T07:40:00Z
---

# Implementation Plan: Triggers schema migrate to array

Based on approved design document: `work-items/triggers-schema-migrate-design.md`

## Approach

Migrate `store.triggers` from object shape to array shape with one-time idempotent migration at startup. Update store accessors to locate entries by `id`. Call migration in `main.js` before triggers start. Add thin legacy IPC shims so the existing settings window keeps working until `settings-ipc-refactor`.

## Files to Create

| File | Purpose |
|------|---------|
| (none) | |

## Files to Modify

| File | Changes |
|------|---------|
| `store.js` | Array defaults; `getTriggerById`/`setTriggerById`; rewrite accessors; `migrateTriggersSchema` |
| `main.js` | Call migration before trigger start; legacy object↔array shims on `get-trigger-config`/`set-trigger-config` |

## Tests

| Test File | Coverage |
|-----------|----------|
| (manual) | Migration script against old-shape object; boot smoke; syntax checks |

## Implementation Checklist

- [ ] Update `defaults.triggers` to array shape
- [ ] Add `getTriggerById` / `setTriggerById`
- [ ] Rewrite `getTriggerConfig` / `setTriggerConfig` (array only, non-array guard)
- [ ] Reimplement idle/app-detection accessors on by-id helpers
- [ ] Add and export `migrateTriggersSchema`
- [ ] Call migration in `main.js` before `idleTrigger.start()`
- [ ] Legacy IPC shims for existing settings renderer
- [ ] Verify `idle-trigger.js` / `app-detection-trigger.js` unchanged

---
*Plan approved. Execution follows.*
