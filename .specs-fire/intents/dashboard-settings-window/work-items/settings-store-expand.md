---
id: settings-store-expand
title: Settings store expand
intent: dashboard-settings-window
complexity: low
mode: autopilot
status: pending
depends_on: []
created: 2026-07-12T00:31:00-07:00
---

# Work Item: Settings store expand

## Description

Add the new top-level settings required by the dashboard to `store.js` defaults and expose typed accessors. This is the foundation piece — no schema migration yet, only additive top-level keys. Existing keys (`buttonPosition`, `launchAtLogin`, `triggers.*`) stay untouched.

New keys (defaults per spec `scratch/dashboard-spec.md`):
- `startMinimized` (boolean, default `false`)
- `cancelWindowSeconds` (number, default `2`)
- `buttonOpacity` (number, default `0.4`)
- `buttonColor` (string hex, default `'#D9534F'`)

Add accessor pairs: `getStartMinimized`/`setStartMinimized`, `getCancelWindowSeconds`/`setCancelWindowSeconds`, `getButtonOpacity`/`setButtonOpacity`, `getButtonColor`/`setButtonColor`. Export them from `module.exports`.

## Acceptance Criteria

- [ ] `store.js` `defaults` includes `startMinimized`, `cancelWindowSeconds`, `buttonOpacity`, `buttonColor` with the spec defaults.
- [ ] Getter/setter pairs exist for all four new keys and are exported.
- [ ] Existing keys and accessors unchanged; no migration logic added.
- [ ] `bun start` launches without errors and a fresh userData store contains the new defaults.
- [ ] No new dependencies added.

## Technical Notes

Keep the existing `electron-store` import style (`require('electron-store').default`). Match the existing accessor naming pattern exactly (`getX` / `setX`). Do not touch the `triggers.*` shape here — that is work item `triggers-schema-migrate`.

## Dependencies

(none)
