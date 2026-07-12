# Walkthrough: Triggers schema migrate to array

**Run**: run-sirenguard-002  
**Work item**: triggers-schema-migrate  
**Intent**: dashboard-settings-window  
**Mode**: validate (Batch Run B)

## What Was Built

Migrated persisted trigger configuration from an object keyed by type (`triggers.idle`, `triggers.appDetection`) to an array of entries identified by `id`, with a one-time startup migration and updated store accessors.

## Changes

### Modified: `store.js`

- `defaults.triggers` is now an array with `idle` and `app-detection` entries.
- New helpers: `getTriggerById`, `setTriggerById`, `migrateTriggersSchema`, `defaultTriggersArray`.
- `getIdleTrigger` / `getAppDetectionTrigger` and related setters now use by-id lookup.
- `setTriggerConfig` accepts arrays only; logs and no-ops on non-array input.

### Modified: `main.js`

- Calls `migrateTriggersSchema()` in `app.whenReady()` before triggers start.
- Legacy IPC shims convert object ↔ array for the existing settings window (`get-trigger-config` / `set-trigger-config`).

### Unchanged (verified)

- `idle-trigger.js`, `app-detection-trigger.js` — still use `getIdleTrigger()` / `getAppDetectionTrigger()`; entry fields unchanged.

## Deviations from Design

Added legacy IPC shims in `main.js` (not listed in design affected files) to keep the current settings UI working until `settings-ipc-refactor`. Aligns with that work item's "thin shim" guidance.

## How to Verify

1. `node --check store.js main.js` — pass.
2. Boot: `env -u ELECTRON_RUN_AS_NODE bun start` — no errors.
3. **Migration**: Copy an old-shape `config.json` into userData, launch once — `triggers` should become an array; relaunch should not duplicate entries.
4. **Triggers**: Enable idle/app-detection in settings, confirm arm/lock still works.

## Next in Batch Plan

**Run C (confirm)**: `cancel-window-wiring`, `settings-ipc-refactor`, then dashboard section work items.

Re-invoke `/specsmd-fire-builder` to start Run C.
