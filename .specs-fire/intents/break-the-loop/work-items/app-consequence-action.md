---
id: app-consequence-action
title: App force-quit + re-entry block action
intent: break-the-loop
complexity: medium
mode: confirm
status: completed
depends_on:
  - break-the-loop-store
created: 2026-07-13T10:51:00-07:00
run_id: run-sirenguard-008
completed_at: 2026-07-13T18:01:42.688Z
---

# Work Item: App force-quit + re-entry block action

## Description

Implement the consequence action used by the app-detection trigger: after the reminder completes, force-quit the flagged frontmost app, then start a 5-minute re-entry block for that app's bundle id / name. During the block, if the same app becomes frontmost again, `lock-orchestration.arm()` is invoked immediately with the 2 s cancel window suppressed (escalation-style instant re-arm). Reuse the existing `app-detection-trigger` polling and `getAppDetectionTrigger` config; add a small in-memory block registry keyed by app identity with expiry timestamps.

Force-quit via `osascript -e 'tell application "<name>" to quit'` (graceful) with a `kill` fallback by bundle id if the app is still running after a short grace period. Match existing `app-detection-trigger.js` patterns for running AppleScript and polling.

## Acceptance Criteria

- [ ] After reminder completion, the flagged frontmost app is quit; if still running after a short grace period, it is killed by bundle id
- [ ] A 5-minute re-entry block is recorded for the app identity (name + bundle id)
- [ ] While the block is active, the app coming frontmost again triggers an immediate arm with no 2 s cancel window (delegates to `lock-orchestration`)
- [ ] After the block expires, normal app-detection behavior resumes
- [ ] Errors during quit/kill are logged with the `siren-guard:` prefix and do not crash the app
- [ ] No new external dependencies; reuses `child_process.exec` and existing trigger infrastructure
- [ ] Unit tests cover block registration, expiry, and the "frontmost during block → instant arm" decision (mock `lockOrchestration.arm` and the clock)

## Technical Notes

Coordinate with `lock-orchestration-refactor` on the "suppress cancel" signal — this work item should call a clear entry point (e.g. `lockOrchestration.arm({ suppressCancel: true })` or a dedicated `armImmediate()`) rather than reaching into orchestration internals. Keep the block registry in the trigger module (not the store) since it is ephemeral runtime state.

## Dependencies

- break-the-loop-store
