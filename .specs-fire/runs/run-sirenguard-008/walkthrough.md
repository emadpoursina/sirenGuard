---
run: run-sirenguard-008
intent: break-the-loop
mode: confirm
---

# Walkthrough: Batch B — consequences, friction, reminder UI, drag fix

## Summary

Implemented app/website consequence actions with 5-minute re-entry blocks and instant re-arm, a friction gate for disable/quit/override, dashboard Reminder section, and floating-button JS drag repositioning.

## Key Changes

- `lockOrchestration.arm({ suppressCancel: true })` for escalation-style instant lock
- `re-entry-block.js` shared registry; blocks live in trigger modules
- `POST/GET /close-tab` + extension polling closes matched tabs
- Friction gate: 30s countdown + exact phrase match; `overrideUntil` suspends triggers 1h
- Reminder section: media upload IPC, safe app picker, phrase, override log
- Floating button: drag threshold + `set-position` IPC

## Verify

```bash
bun test   # 65 passing
bun start  # manual: drag button, Settings → Reminder, tray Override/Quit friction
```

## Next

Batch C (validate): `reminder-overlay` → `lock-orchestration-refactor`
