---
id: app-detection-trigger
title: App-detection trigger
intent: triggers-and-settings
complexity: medium
mode: confirm
status: completed
depends_on: [lock-orchestration, trigger-config-store]
created: 2026-07-03T07:39:00-07:00
run_id: run-sirenguard-2026-003
completed_at: 2026-07-03T08:25:00-07:00
---

# Work Item: App-detection trigger

## Description

Implement an app-detection trigger in the main process that polls the frontmost macOS app and arms the lock (via the shared orchestration) after the configured delay when a flagged app is frontmost. Respects the trigger's enabled flag, delay, and flagged-apps list from `trigger-config-store`.

## Acceptance Criteria

- [ ] When the app-detection trigger is enabled, the app polls the frontmost app at a sensible interval.
- [ ] When a flagged app is frontmost for the configured delay, the app calls `arm` (2s cancel window).
- [ ] Switching away from a flagged app before the delay elapses resets the timer (no lock).
- [ ] Disabling the trigger or removing the flagged app from the list stops it from arming (live-apply).
- [ ] Matching tolerates both display name and bundle ID forms stored in config.
- [ ] No new dependencies; frontmost-app lookup via a no-dep mechanism (e.g. `osascript`).

## Technical Notes

- Candidate frontmost lookup: `osascript -e 'tell application "System Events" to get name of first process whose frontmost is true'`. Verify whether this prompts for accessibility/automation permission; if it does, document it and consider the bundle-id alternative via `lsappinfo` / `osascript` against `System Events` process list.
- Polling interval vs. delay: keep the delay timer separate from the poll interval.
- Clear timers on quit and on disable.

## Dependencies

- lock-orchestration
- trigger-config-store
