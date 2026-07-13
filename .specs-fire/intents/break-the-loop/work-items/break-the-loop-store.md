---
id: break-the-loop-store
title: Break-the-loop settings store + asset storage
intent: break-the-loop
complexity: low
mode: autopilot
status: completed
depends_on: []
created: 2026-07-13T10:51:00-07:00
run_id: run-sirenguard-007
completed_at: 2026-07-13T17:55:49.727Z
---

# Work Item: Break-the-loop settings store + asset storage

## Description

Add the foundation settings required by the break-the-loop features to `store.js` defaults and expose accessors, following the existing `getButtonPosition`/`setButtonPosition` style. This is additive only — no schema migration of existing keys. New top-level keys:

- `reminder`: `{ mediaType: 'image' | 'video' | null, mediaPath: string | null, caption: string, minWatchSec: number }` (default `minWatchSec: 10`, others null/empty).
- `safeApp`: `{ name: string | null, bundleId: string | null }` (used by the idle consequence).
- `confirmationPhrase`: string (default `''`).
- `overrideLog`: array of `{ timestamp, kind }` entries (default `[]`).
- Fixed defaults exposed as constants (not user-editable in v1): re-entry block `5 * 60` s, escalation window `15 * 60` s, min watch `10` s.

Also add a helper to resolve/normalize the reminder asset path under the Electron `userData` directory (e.g. `path.join(app.getPath('userData'), 'reminder-media')`), and helpers to append to / read the `overrideLog`. Surface the new keys through the existing `getAllSettings` / `updateSettings` flow so the dashboard and main process can read/write them without new bespoke IPC.

## Acceptance Criteria

- [ ] `store.js` defaults include `reminder`, `safeApp`, `confirmationPhrase`, and `overrideLog` with the shapes above
- [ ] Accessors exist: `getReminder`/`setReminder`, `getSafeApp`/`setSafeApp`, `getConfirmationPhrase`/`setConfirmationPhrase`, `getOverrideLog`/`appendOverrideLog`
- [ ] Re-entry block, escalation window, and min watch durations are exported as named constants (seconds) with the fixed defaults
- [ ] A helper resolves the reminder-media directory under `userData` and ensures it exists on demand
- [ ] `getAllSettings` returns the new keys and `updateSettings` merges partial updates for them (matching existing merge behavior)
- [ ] Existing keys (`buttonPosition`, `launchAtLogin`, `triggers.*`) are untouched
- [ ] Unit tests cover default shape, accessor round-trips, `appendOverrideLog` append behavior, and `updateSettings` merge for the new keys

## Technical Notes

Keep accessor naming consistent with existing `getButtonPosition`/`setButtonPosition`. Do not introduce a new dependency. The media asset itself (file bytes) is written by a later work item (dashboard upload + reminder overlay); this item only owns config + path resolution. If `electron-store` default merging needs care for nested `reminder`/`safeApp` objects, mirror the pattern already used for `triggers`.

## Dependencies

(none)
