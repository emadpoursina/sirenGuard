---
id: website-detection-trigger
title: Website-detection trigger module
intent: website-trigger
complexity: medium
mode: confirm
status: completed
depends_on:
  - website-trigger-store
created: 2026-07-12T05:37:00-07:00
run_id: run-sirenguard-006
completed_at: 2026-07-12T13:06:13.172Z
---

# Work Item: Website-detection trigger module

## Description

Create a new `website-detection-trigger.js` module parallel to `app-detection-trigger.js`, but event-driven instead of polling. It consumes match/leave signals (sourced from the local server in a later work item), applies the `website-detection` trigger's `enabled` and `delaySec` gating, and arms/cancels `lock-orchestration` exactly like the app-detection trigger does. Started/stopped from `main.js` alongside the other triggers.

## Acceptance Criteria

- [ ] `website-detection-trigger.js` exports `start()`, `stop()`, `onSiteMatch(hostname, url)`, and `onSiteLeave()` (or equivalent event API)
- [ ] On `onSiteMatch`: if trigger `enabled` and not already armed and not `lockOrchestration.isArmed()`, record match timestamp; once `delaySec` elapses with continuous match, call `lockOrchestration.arm()` and track `weArmed`
- [ ] On `onSiteLeave`: clear the match timestamp and, if `weArmed`, call `lockOrchestration.cancel()` and reset `weArmed`
- [ ] When `enabled` is false at match time, no arming occurs and any armed state from this trigger is cancelled
- [ ] `start()`/`stop()` are idempotent; `stop()` clears any in-flight delay timer and armed state owned by this trigger
- [ ] Wired into `main.js` (`whenReady` → `start()`, `will-quit` → `stop()`) without disturbing idle/app-detection triggers
- [ ] No external dependencies added; plain JS; surgical edits to `main.js`

## Technical Notes

Reuse the delay-gating pattern from `app-detection-trigger.js` (`flaggedSinceMs`, `weArmed`, `delaySec`) but driven by pushed events rather than an `osascript` poll. Keep a single owned timer for the arm delay. Do not duplicate `lockScreen` — go through `lock-orchestration`.

## Dependencies

- website-trigger-store
