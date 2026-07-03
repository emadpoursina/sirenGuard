---
id: idle-timer-trigger
title: Idle-timer trigger
intent: triggers-and-settings
complexity: medium
mode: confirm
status: pending
depends_on: [lock-orchestration, trigger-config-store]
created: 2026-07-03T07:39:00-07:00
---

# Work Item: Idle-timer trigger

## Description

Implement an idle-timer trigger in the main process that polls macOS system idle time and arms the lock (via the shared orchestration from `lock-orchestration`) once the configured idle threshold is reached. Respects the trigger's enabled flag and reads its threshold from `trigger-config-store`.

## Acceptance Criteria

- [ ] When the idle trigger is enabled, the app polls system idle time at a sensible interval (e.g. every few seconds).
- [ ] When idle time crosses the configured threshold, the app calls `arm` (starting the 2s cancel window).
- [ ] User activity that resets idle time below threshold during the cancel window allows the existing cancel flow to proceed (no re-arm spam).
- [ ] Disabling the trigger in config stops it from arming (live-apply, no restart).
- [ ] No new dependencies; idle time obtained via a no-dep mechanism (e.g. shelling out to `ioreg -c IOHIDSystem` or another built-in CLI).

## Technical Notes

- Candidate idle-time source: `ioreg -c IOHIDSystem | grep -i HIDIdleTime` (parse nanoseconds since boot). Verify during execution; avoid any approach requiring accessibility permissions.
- Timer should be cleared on app quit and on disable to avoid orphaned arming.
- Re-arming logic: do not arm if already armed; reset the polling baseline after a lock or cancel.

## Dependencies

- lock-orchestration
- trigger-config-store
