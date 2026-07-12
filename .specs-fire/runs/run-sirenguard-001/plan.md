---
run: run-sirenguard-001
work_item: settings-store-expand
intent: dashboard-settings-window
mode: autopilot
checkpoint: none
approved_at: 2026-07-12T07:38:00Z
---

# Implementation Plan: Settings store expand

## Approach

Add four new top-level keys to the `electron-store` defaults object and expose matching getter/setter pairs following the existing `getX`/`setX` pattern. No migration logic, no changes to `triggers.*` shape, no new runtime dependencies for the feature.

## Files to Create

| File | Purpose |
|------|---------|
| (none) | |

## Files to Modify

| File | Changes |
|------|---------|
| `store.js` | Add defaults: `startMinimized`, `cancelWindowSeconds`, `buttonOpacity`, `buttonColor`; add four getter/setter pairs; export them |

## Tests

| Test File | Coverage |
|-----------|----------|
| (manual) | `node --check store.js`; boot smoke via `env -u ELECTRON_RUN_AS_NODE bun start` |

## Technical Details

Defaults per spec:
- `startMinimized`: `false`
- `cancelWindowSeconds`: `2`
- `buttonOpacity`: `0.4`
- `buttonColor`: `'#D9534F'`

---
*Plan approved at checkpoint. Execution follows.*
