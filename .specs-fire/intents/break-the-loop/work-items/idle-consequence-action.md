---
id: idle-consequence-action
title: Idle redirect-to-safe-app + lock action
intent: break-the-loop
complexity: low
mode: autopilot
status: completed
depends_on:
  - break-the-loop-store
created: 2026-07-13T10:51:00-07:00
run_id: run-sirenguard-007
completed_at: 2026-07-13T17:56:00.993Z
---

# Work Item: Idle redirect-to-safe-app + lock action

## Description

Implement the consequence action used by the idle trigger: after the reminder completes, activate the configured safe app (`safeApp.name` / `safeApp.bundleId`) via `osascript`, then lock the screen through the existing `open -a ScreenSaverEngine` path. If no safe app is configured, fall back to a plain lock. Reuses `lockOrchestration` for the lock step and `store.getSafeApp()` for the target.

## Acceptance Criteria

- [ ] After reminder completion, the configured safe app is brought to the front via `osascript -e 'tell application "<name>" to activate'` (or by bundle id)
- [ ] The screen is then locked via the existing lock command
- [ ] If `safeApp` is null/empty, the action degrades to a plain lock (no error)
- [ ] If the safe app is not installed/running, activation fails gracefully and the lock still runs
- [ ] Errors are logged with the `siren-guard:` prefix and do not crash the app
- [ ] No new external dependencies; reuses `child_process.exec` and `lockOrchestration`
- [ ] Unit tests cover: safe app set → activate then lock; safe app unset → lock only; activation error → lock still runs (mock `exec` and `lockOrchestration.lockScreen`)

## Technical Notes

Keep this action small and dependency-light; it is intentionally `low` complexity. Match the existing AppleScript helper style used in `app-detection-trigger.js` / `main.js`. The reminder-first ordering is enforced by `lock-orchestration-refactor`; this item only implements the "activate safe app then lock" step behind a clear function the orchestration can call.

## Dependencies

- break-the-loop-store
