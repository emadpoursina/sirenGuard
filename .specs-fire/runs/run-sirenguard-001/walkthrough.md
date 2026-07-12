# Walkthrough: Settings store expand

**Run**: run-sirenguard-001  
**Work item**: settings-store-expand  
**Intent**: dashboard-settings-window  
**Mode**: autopilot (Batch Run A — autopilot group)

## What Was Built

Extended `store.js` with four new top-level settings keys required by the dashboard spec, each with matching getter/setter accessors exported from the module.

## Changes

### Modified: `store.js`

**New defaults** (additive only):

| Key | Type | Default |
|-----|------|---------|
| `startMinimized` | boolean | `false` |
| `cancelWindowSeconds` | number | `2` |
| `buttonOpacity` | number | `0.4` |
| `buttonColor` | string (hex) | `'#D9534F'` |

**New accessors**: `getStartMinimized`/`setStartMinimized`, `getCancelWindowSeconds`/`setCancelWindowSeconds`, `getButtonOpacity`/`setButtonOpacity`, `getButtonColor`/`setButtonColor`.

Existing `buttonPosition`, `launchAtLogin`, and `triggers.*` keys/accessors are unchanged. No migration logic was added.

## Decisions

- Placed new keys between `launchAtLogin` and `triggers` in defaults — keeps general prefs grouped before trigger config.
- Followed existing `getX`/`setX` naming exactly; no validation in setters (consistent with existing accessors).

## Deviations from Plan

None.

## Dependencies Added

None for this work item. (`yaml` was added to the project earlier by FIRE tooling for state scripts — not part of this feature.)

## How to Verify

1. `node --check store.js` — should pass with no output.
2. `env -u ELECTRON_RUN_AS_NODE bun start` — app should launch without errors.
3. On a fresh userData store, inspect config file — should contain the four new keys with defaults (after first launch).

## Next in Batch Plan

**Run B (validate)**: `triggers-schema-migrate` — depends on this work item.

**Run C (confirm)**: `cancel-window-wiring`, `settings-ipc-refactor`, dashboard section work items.

**Remaining autopilot** (after dependencies): `dashboard-shell`, `dashboard-about-section`.

Re-invoke `/specsmd-fire-builder` to start Run B.
