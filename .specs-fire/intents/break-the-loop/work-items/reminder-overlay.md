---
id: reminder-overlay
title: Reminder overlay window + renderer
intent: break-the-loop
complexity: high
mode: validate
status: pending
depends_on:
  - break-the-loop-store
created: 2026-07-13T10:51:00-07:00
---

# Work Item: Reminder overlay window + renderer

## Description

Add a fullscreen, always-on-top, transparent `BrowserWindow` that plays the configured reminder (image or short video) with an optional caption before a consequence runs. Shown only on automatic triggers (not the manual button). The overlay enforces a minimum watch time (~10 s) or clip-end before the user can dismiss; there is no instant skip. On completion it signals the main process via IPC so `lock-orchestration` can proceed to the action strategy.

New IPC: `reminder:show` (main → overlay, payload includes media type/path + caption + minWatchSec) and `reminder:complete` (overlay → main). The overlay renderer reads the asset from the resolved `userData` path. Window lifecycle: created lazily, shown on `reminder:show`, hidden/destroyed on completion, and never blocks app quit.

## Acceptance Criteria

- [ ] Overlay window is fullscreen, frameless, transparent, always-on-top, and appears above other windows (and above the lock screen where possible)
- [ ] Image reminders display centered with the caption beneath; video reminders autoplay once with controls hidden
- [ ] Skip/dismiss is disabled until either the video finishes or `minWatchSec` elapses; a visible countdown or progress indicator communicates remaining wait time
- [ ] On dismiss, `reminder:complete` is sent to the main process exactly once
- [ ] Missing/invalid media path fails gracefully: overlay shows the caption (or a fallback message) and still enforces `minWatchSec` before completing
- [ ] Overlay does not block `will-quit` and is destroyed cleanly on quit
- [ ] Video size is capped (~15–30 s); oversized files are rejected at upload time (enforced in the dashboard upload work item, surfaced here via graceful handling)
- [ ] No new external dependencies; plain HTML/CSS/JS renderer matching existing style
- [ ] Manual floating-button arm does not open the overlay

## Technical Notes

Design doc required (Validate mode). Key decisions to capture: window reuse vs create-per-show; how to guarantee always-on-top over `ScreenSaverEngine` (may need `alwaysOnTop` level `screen-saver` or `pop-up-menu`); video element behavior under Electron; whether `minWatchSec` runs concurrently with video playback (max of clip duration and minWatchSec). Keep the overlay renderer in `renderer/reminder/` to match existing layout. IPC channel names stay kebab-case (`reminder:show`, `reminder:complete`).

## Dependencies

- break-the-loop-store
