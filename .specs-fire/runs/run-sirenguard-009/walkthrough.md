---
run: run-sirenguard-009
---

# Walkthrough: Batch C — reminder overlay + staged lock pipeline

## What shipped

Automatic triggers (idle, app, website) now follow a three-stage pipeline:

1. **Cancel window** (2s by default; skipped on escalation or re-entry block)
2. **Reminder overlay** — fullscreen photo/video with min-watch countdown
3. **Consequence** — app quit, tab close, or safe-app redirect + lock

Manual floating-button lock is unchanged: cancel window → lock, no reminder.

## Key files

| File | Role |
|------|------|
| `reminder-overlay.js` | Creates/shows fullscreen reminder window |
| `reminder-preload.js` | IPC bridge for reminder renderer |
| `renderer/reminder/` | HTML/CSS/JS for media + countdown |
| `lock-orchestration.js` | Staged pipeline + escalation |
| `test/zz-lock-orchestration-pipeline.test.js` | Integration tests (isolated run) |

## How to verify manually

1. `bun run test` — 70 tests, two subprocesses
2. `bun start`
3. Upload a reminder image in Dashboard → Reminder
4. Trigger idle or visit a flagged site — expect reminder before lock/quit/close
5. Tap floating button — expect lock without reminder

## Intent status

This completes the **break-the-loop** intent (all 9 work items done).
