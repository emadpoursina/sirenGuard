---
id: disable-quit-friction
title: Disable / quit / override friction gate
intent: break-the-loop
complexity: medium
mode: confirm
status: pending
depends_on:
  - break-the-loop-store
created: 2026-07-13T10:51:00-07:00
---

# Work Item: Disable / quit / override friction gate

## Description

Add a high-friction (but not impossible) gate before any action that would weaken the guard: disabling a trigger in the dashboard, quitting SirenGuard from the tray, and a new "Override for 1 hour" tray item. The gate is a small modal `BrowserWindow` (or overlay) showing a 30-second countdown, after which the user must type the configured `confirmationPhrase` exactly and confirm. On success the gated action proceeds; on close/cancel it is aborted. Successful overrides are appended to `overrideLog` via `appendOverrideLog` with a timestamp and kind (`disable-trigger` | `quit` | `override-1h`).

"Override for 1 hour" temporarily suspends all automatic triggers for 60 minutes, then re-enables them automatically. New IPC: `friction:request` (kind) → shows gate; `friction:confirm` (kind, phrase) → validates and executes or rejects.

## Acceptance Criteria

- [ ] Triggering disable (a trigger toggle in the dashboard), tray Quit, and "Override for 1 hour" all open the friction gate instead of acting immediately
- [ ] The gate enforces a 30-second countdown before the phrase input is accepted
- [ ] The action proceeds only when the typed phrase exactly matches `getConfirmationPhrase()`
- [ ] Successful gated actions append an entry to `overrideLog` with timestamp and kind
- [ ] "Override for 1 hour" suspends automatic triggers for 60 minutes and auto-resumes them after; the suspension state survives app restart via a stored `overrideUntil` timestamp
- [ ] Closing the gate or a phrase mismatch aborts the action with no side effects
- [ ] If `confirmationPhrase` is empty, the gate prompts the user to set one first (does not bypass friction)
- [ ] Unit tests cover countdown gating, phrase match/mismatch, override-log append, and the 1-hour suspension window (mock the clock)

## Technical Notes

The gate window should be small, frameless, and non-trivial to dismiss (no instant close-without-confirm beyond the explicit cancel). Keep the phrase comparison exact and case-sensitive to preserve friction. The 1-hour override suspension must be checked by each automatic trigger's `tick`/`onSiteMatch` (short-circuit when `now < overrideUntil`). Coordinate with `dashboard-reminder-section` so the phrase can be set from Settings. IPC channel names stay kebab-case.

## Dependencies

- break-the-loop-store
