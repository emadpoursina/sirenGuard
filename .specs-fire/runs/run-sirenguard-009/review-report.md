---
run: run-sirenguard-009
status: approved
---

# Review Report: Batch C (validate)

## reminder-overlay

- Overlay is lazy-created and destroyed on quit; `reminder:complete` IPC gates pipeline continuation.
- Min-watch enforced in renderer before enabling Continue; aligns with brief (no instant dismiss).
- No new dependencies; preload follows existing friction-gate pattern.

## lock-orchestration-refactor

- Manual floating button path preserved without reminder.
- Automatic triggers always show reminder before consequence (including `suppressCancel` / escalation).
- Escalation suppresses cancel window only; reminder still plays.
- Circular dependency avoided: `website-consequence-action` lazy-requires `website-detection-trigger` for block registry.
- `resetEscalationForTests` exported for test isolation.

## Test hygiene

- `mock.module()` leaks across files in Bun 1.3.9; `package.json` `test` script runs pipeline tests in a second process.
- Website and idle tests refactored to apply mocks in `beforeEach` with dynamic imports.

## Risks / follow-ups

- Reminder overlay requires configured media for full manual QA; empty media still completes pipeline in tests.
- User should verify System Settings → Lock Screen → Require password: Immediately for lock action.
