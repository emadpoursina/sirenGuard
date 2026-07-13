---
run: run-sirenguard-009
scope: batch
mode: validate
---

# Implementation Plan: Batch C (validate)

## reminder-overlay
- `reminder-overlay.js` fullscreen window + `reminder:complete` IPC
- `renderer/reminder/` UI with min-watch countdown and media display

## lock-orchestration-refactor
- Staged pipeline: cancel window → reminder → consequence action
- `triggerKind` taxonomy: manual | app | website | idle
- Escalation via `ESCALATION_WINDOW_SEC` fall timestamps
- Update all trigger callers + manual button path
