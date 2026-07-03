# Run: run-sirenguard-2026-001

- **Intent**: triggers-and-settings
- **Work item**: trigger-config-store
- **Mode**: autopilot
- **Scope**: single
- **Started**: 2026-07-03T07:41:00-07:00
- **Completed**: 2026-07-03T07:42:00-07:00
- **Status**: completed

## Goal

Extend `store.js` with a trigger-configuration schema and typed getters/setters. No new deps, plain JS, surgical edit to `store.js` only.

## Changes

- Added `triggers` default to the `electron-store` constructor: `idle: { enabled, thresholdSec }` and `appDetection: { enabled, delaySec, flaggedApps: [] }`.
- Added accessors: `getTriggerConfig`/`setTriggerConfig`, `getIdleTrigger`/`setIdleTrigger`, `getAppDetectionTrigger`/`setAppDetectionTrigger`, `getFlaggedApps`/`setFlaggedApps`.
- Existing `buttonPosition` and `launchAtLogin` keys untouched.

## Conventions

- `flaggedApps` is an array of objects `{ name?: string, bundleId?: string }` — matching can tolerate either form. Downstream work items (`app-detection-trigger`, `settings-window`) must follow this shape.

## Verification

- `node --check store.js` passes.
- No linter errors.
- No automated tests in project; manual smoke via `bun start` deferred until a UI-facing work item exercises the store.

## Notes for downstream work items

- Settings window should write via `setTriggerConfig` (full replace) or the granular setters.
- Trigger modules should read config each cycle (live-apply) rather than caching at startup.
