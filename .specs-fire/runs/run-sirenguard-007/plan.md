---
run: run-sirenguard-007
work_item: break-the-loop-store
intent: break-the-loop
mode: autopilot
---

# Implementation Plan: Break-the-loop settings store + asset storage

## Approach

Extend `store.js` with new defaults (`reminder`, `safeApp`, `confirmationPhrase`, `overrideLog`), named duration constants, getters/setters matching existing patterns, reminder-media directory helpers (accept optional `userDataPath` for testability), and wire through `getAllSettings` / `updateSettings`. Export `lockScreen` from `lock-orchestration.js` as a prerequisite for the idle consequence item.

## Files to Create

| File | Purpose |
|------|---------|
| `idle-consequence-action.js` | Safe-app activation + lock for idle trigger consequence |
| `test/idle-consequence-action.test.js` | Unit tests for idle consequence action |

## Files to Modify

| File | Changes |
|------|---------|
| `store.js` | New defaults, constants, accessors, reminder-media helpers, getAllSettings/updateSettings |
| `lock-orchestration.js` | Export `lockScreen` |
| `test/00-store.test.js` | Tests for new store keys and accessors |

## Tests

| Test File | Coverage |
|-----------|----------|
| `test/00-store.test.js` | Default shape, accessor round-trips, appendOverrideLog, updateSettings merge |
| `test/idle-consequence-action.test.js` | Safe app set/unset, activation error still locks |

---

## Work Item: idle-consequence-action

### Approach

Small module that reads `getSafeApp()`, activates via `osascript` (name or bundle id), then calls `lockOrchestration.lockScreen()`. Graceful degradation on missing/failed activation.

### Files to Create

| File | Purpose |
|------|---------|
| `idle-consequence-action.js` | `executeIdleConsequence()` export |

### Files to Modify

| File | Changes |
|------|---------|
| `lock-orchestration.js` | Export `lockScreen` |

### Tests

| Test File | Coverage |
|-----------|----------|
| `test/idle-consequence-action.test.js` | All acceptance scenarios with mocked exec and lockScreen |
