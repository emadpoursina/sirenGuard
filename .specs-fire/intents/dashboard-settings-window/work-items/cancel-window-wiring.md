---
id: cancel-window-wiring
title: Wire cancel window duration into lock-orchestration
intent: dashboard-settings-window
complexity: medium
mode: confirm
status: completed
depends_on:
  - settings-store-expand
created: 2026-07-12T00:31:00-07:00
run_id: run-sirenguard-003
completed_at: 2026-07-12T07:45:02.529Z
---

# Work Item: Wire cancel window duration into lock-orchestration

## Description

Replace the hardcoded `CANCEL_WINDOW_MS = 2000` constant in `lock-orchestration.js` with a value read from the store (`cancelWindowSeconds`, added in `settings-store-expand`). The arm timer uses `cancelWindowSeconds * 1000`. The value must live-apply: when settings update while armed, the next arm uses the new value; if a `settings:changed` arrives mid-arm, the current timer is left to complete on its existing duration (no surprise early locks) — confirm this behavior in the plan checkpoint.

## Acceptance Criteria

- [ ] `lock-orchestration.js` no longer hardcodes 2000ms; it reads `cancelWindowSeconds` from the store at arm time.
- [ ] Changing the cancel-window slider and arming reflects the new duration on the next arm.
- [ ] A `settings:changed` event during an active arm does not shorten/lengthen the running timer in a way that causes an unexpected immediate lock (documented behavior in the run plan).
- [ ] Default behavior (2s) is unchanged when no user override exists.
- [ ] `bun start` works; manual arm/cancel smoke test passes.

## Technical Notes

`lock-orchestration.js` currently has no dependency on `store.js` — importing it introduces a small coupling; keep it to a single `getCancelWindowSeconds()` call inside `arm()`. Do not move the constant into the renderer. Coordinate with `settings-ipc-refactor` which defines the `settings:changed` broadcast the orchestrator may listen to (optional; reading at arm time is sufficient for v1).

## Dependencies

- settings-store-expand
