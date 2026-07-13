---
id: break-the-loop
title: Break the loop — meaningful reminder + stricter actions + escalation +
  disable friction
status: completed
created: 2026-07-13T10:48:00-07:00
completed_at: 2026-07-13T18:13:28.284Z
---

# Intent: Break the loop — meaningful reminder + stricter actions + escalation + disable friction

## Goal

Transform SirenGuard's screen lock into a meaningful "break-the-loop" moment. When an automatic trigger fires, show a personal reminder (photo or short video) before acting, apply a stricter-but-reversible consequence per trigger type, escalate on quick relapse, and gate disabling / quitting / overriding behind high friction. Also fix the floating button so it is reliably movable by mouse drag-and-drop.

## Users

Single user (the developer). Local-only. Same audience as existing intents.

## Problem

Today every trigger only calls `lockOrchestration.arm()`, which locks the screen and is trivially undone: the 2s cancel window, then the user's password unlocks and they return straight to the distraction. There is no *meaning* (no reminder of why they set the guard), no *friction* (no consequence that survives unlocking), and no *escalation* (relapsing within seconds is free). Additionally, the floating button claims to support drag-to-move via `-webkit-app-region: drag`, but in practice it is not movable by mouse because only an ~8px transparent border is draggable while the visible button is `no-drag` and a long press does nothing (`renderer/style.css:16-41`, `renderer/button.js:43-45`).

## Success Criteria

- Global reminder overlay: a single configurable reminder (photo OR short MP4 ~15–30s) plus optional caption, shown fullscreen before action on every **automatic** trigger (idle, app, website). Skip is allowed only after the clip ends or a minimum watch time (~10s) elapses; no instant dismiss.
- App trigger: reminder → force-quit the flagged app → 5-minute re-entry block (reopening the flagged app during the block = instant re-arm with no 2s cancel).
- Website trigger: reminder → close the matched tab via the existing MV3 browser extension → 5-minute re-entry block on that site (revisiting = instant re-arm, no cancel).
- Idle trigger: reminder → redirect focus to a chosen "safe" app → then lock the screen.
- Escalation: if the user re-falls to the same trigger within a 15-minute window, the 2s cancel is suppressed, the reminder replays, and the action runs immediately.
- Disable / quit friction: turning off a trigger, quitting SirenGuard, or invoking an "Override for 1 hour" action all require a 30-second countdown plus typing a confirmation phrase. Overrides are logged locally so the user can see when they used them.
- Manual floating button: remains a plain lock with no reminder (the intentional "stop now" button). Behavior otherwise unchanged.
- Undo is always possible through intentional ~45s effort — nothing is permanent.
- Fixed defaults for v1: 15-minute escalation window, 5-minute re-entry block, 10-second minimum watch time. No new Settings UI for these values in this intent.
- Floating button drag-and-drop (fix, final work item): the button is movable by mouse by grabbing the button itself (JS drag that distinguishes drag vs click via the existing ~200ms / movement threshold); position persists across restarts via the existing `buttonPosition` store; drag-vs-click preserved (short press = arm/cancel, drag = move); Reset Position in Settings still works. Likely requires a new/extended IPC to move the window from the renderer (today only the main process moves the window on the `'moved'` event).

## Constraints

- macOS-only; plain JavaScript in main/preload/renderer; Bun; surgical edits; no new external dependencies without explicit approval; no TypeScript and no build step.
- Reuse existing infrastructure: `lock-orchestration` arm/cancel, existing triggers (idle / app / website), existing MV3 browser extension and tab-close capability, `electron-store` settings, and the existing dashboard shell.
- Reminder asset stored locally (app data / electron-store); video capped at roughly 15–30 seconds.
- Match existing naming and indentation conventions; IPC channel names stay kebab-case.
- Breaking changes to the `preload.js` IPC contract must be noted in the run/PR description.

## Notes

Decisions captured during intent capture:

- Reminder scope: one global reminder asset (not per-trigger).
- Media: photo + short video supported in v1 (not photo-only).
- Escalation / re-entry / watch-time values: fixed sensible defaults, not exposed in Settings for v1.
- Disable / quit friction: included in this intent (covers trigger disable, app quit, and "Override for 1 hour"); overrides logged locally.
- Manual floating button: plain lock, no reminder (intentional "stop now" button).
- Floating button move: captured as a real fix (not just polish) because current `-webkit-app-region: drag` only covers an ~8px transparent border and is effectively unusable; the work item should implement JS drag by grabbing the button itself.
