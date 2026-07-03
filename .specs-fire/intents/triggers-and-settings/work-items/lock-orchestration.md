---
id: lock-orchestration
title: Lock/cancel orchestration refactor
intent: triggers-and-settings
complexity: high
mode: validate
status: pending
depends_on: []
created: 2026-07-03T07:39:00-07:00
---

# Work Item: Lock/cancel orchestration refactor

## Description

Move the arm -> 2s countdown -> lock-or-cancel flow into a shared main-process state machine so that any trigger (manual click or automatic) can initiate the same cancel window. Today the renderer owns the countdown and calls `lock` on completion; automatic triggers fire from the main process, so the orchestration must live in main and the renderer must reflect/controls the armed state via IPC. Touches `main.js`, `preload.js`, and `renderer/`.

## Acceptance Criteria

- [ ] Main process owns a single arm/cancel state machine with a 2s countdown that either locks (via `open -a ScreenSaverEngine`) or is cancelled.
- [ ] New IPC channels: `arm` (start countdown), `cancel` (abort countdown), and an event `armed-state` pushed to the renderer to reflect armed/idle visuals.
- [ ] Existing manual click path is migrated to call `arm` and renders the same armed/counting-down visual state as before.
- [ ] Clicking the floating button during the armed window cancels the countdown (no lock).
- [ ] Manual click lock behavior is unchanged from v1 end-user perspective (2s window, then lock).
- [ ] `preload.js` IPC surface changes are documented for the PR description (constitution requirement).

## Technical Notes

- Keep `lock-screen` IPC for now only if needed; prefer unifying around `arm`/`cancel`. Avoid leaving dead IPC handlers.
- The armed state event should be idempotent: re-arming while already armed resets the countdown.
- No new dependencies; no TypeScript. Surgical edits, match existing indentation/naming.
- This is the foundation for the idle-timer and app-detection triggers, which will call the same `arm` path.

## Dependencies

(none)
