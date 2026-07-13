---
id: lock-orchestration-refactor
title: Lock orchestration staged pipeline + escalation
intent: break-the-loop
complexity: high
mode: validate
status: completed
depends_on:
  - break-the-loop-store
  - reminder-overlay
  - app-consequence-action
  - website-consequence-action
  - idle-consequence-action
created: 2026-07-13T10:51:00-07:00
run_id: run-sirenguard-009
completed_at: 2026-07-13T18:13:28.278Z
---

# Work Item: Lock orchestration staged pipeline + escalation

## Description

Refactor `lock-orchestration.js` from the current "arm → 2 s timer → lock" flow into a staged pipeline that ties the break-the-loop pieces together. New flow for automatic triggers:

1. `arm({ triggerKind })` — record fall timestamp; check escalation (a prior fall for the same `triggerKind` within the 15-minute window) → if escalating, suppress the 2 s cancel window.
2. Show the reminder overlay (automatic triggers only) via `reminder:show`; wait for `reminder:complete`.
3. On completion, dispatch the matching action strategy by `triggerKind`: `app` → app force-quit + block, `website` → tab-close + block, `idle` → safe-app redirect + lock, `manual` → plain lock (no reminder, no block).
4. Start the relevant re-entry block (owned by the action modules) and emit the armed-state events the floating button already listens to.

`cancel()` honors escalation: during an escalated arm, cancel is suppressed (the reminder has already played / the action is in progress). The manual floating-button path remains plain lock with the existing 2 s cancel window and no reminder. Preserve the existing `armed-state` IPC event so the floating button's armed/cancel UI keeps working.

## Acceptance Criteria

- [ ] `arm()` accepts a `triggerKind` argument (`manual` | `app` | `website` | `idle`); existing callers updated
- [ ] Automatic triggers show the reminder overlay and wait for `reminder:complete` before running the action; manual triggers skip the reminder and lock directly
- [ ] Each `triggerKind` dispatches to the correct action strategy from the consequence-action work items
- [ ] Escalation: a second fall for the same `triggerKind` within the 15-minute window suppresses the 2 s cancel window
- [ ] `cancel()` is suppressed during an escalated arm and during/after the reminder has completed
- [ ] The existing `armed-state` IPC event still fires so the floating button armed/cancel UI works unchanged
- [ ] The 2 s cancel window still works for non-escalated automatic and manual arms (until reminder completion)
- [ ] Re-entry block re-arms (from the action modules) integrate without conflicting with the escalation timer
- [ ] No circular dependencies with the action modules (they call a clear orchestration entry point; orchestration calls their action functions)
- [ ] Unit tests cover: manual path unchanged, automatic path plays reminder then acts, escalation suppresses cancel, and dispatch per `triggerKind` (mock overlay IPC + action modules)

## Technical Notes

Design doc required (Validate mode). Key decisions: the exact `triggerKind` taxonomy and how callers pass it (idle/app/website triggers + manual button + re-entry re-arms); whether escalation state lives in `lock-orchestration` or a small shared module; how `reminder:complete` is awaited (event-based promise); and how to keep the floating-button `armed-state` semantics intact when the flow is now reminder → action instead of timer → lock. Keep IPC channel names kebab-case. Surgical edits to `lock-orchestration.js`; update callers in `main.js`, `idle-trigger.js`, `app-detection-trigger.js`, `website-detection-trigger.js`, and `renderer/button.js`.

## Dependencies

- break-the-loop-store
- reminder-overlay
- app-consequence-action
- website-consequence-action
- idle-consequence-action
