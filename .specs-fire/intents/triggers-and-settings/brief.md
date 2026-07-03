---
id: triggers-and-settings
title: Multiple trigger types and settings screen
status: in_progress
created: 2026-07-03T07:37:00-07:00
---

# Intent: Multiple trigger types and settings screen

## Goal

Extend Siren Guard beyond the manual floating button with two new automatic trigger types — an idle-timer trigger and an app-detection trigger — plus a settings screen to enable/disable and configure each trigger. Implements the first two items of the post-v1 roadmap in `scratch/siren-guard-docs.md`.

## Users

Single user (the developer), local-only. No auth, no multi-user.

## Problem

v1 only locks on a manual click. Passive guardrails are missing: there is no way to auto-lock after the machine has been idle for a set time, and no way to auto-lock when a known distraction app (Instagram, YouTube Shorts, etc.) is brought to the front. There is also no UI to configure triggers — the tray menu only exposes Launch-at-Login and Quit.

## Success Criteria

- Idle-timer trigger fires a lock (with the existing 2s cancel/undo window) after a configurable idle threshold.
- App-detection trigger fires a lock (with the existing 2s cancel/undo window) after a configurable delay when a flagged app becomes the frontmost app.
- Settings window opens from a new "Settings..." tray menu item as a separate `BrowserWindow`.
- Settings persist via `electron-store` and changes apply live (no app restart required).
- App-detection flagged-app list can be populated by picking from currently-running apps and/or by manually entering app names / bundle IDs.
- Existing manual-click lock behavior and the floating button remain unchanged.
- No new external dependencies are introduced; no TypeScript is added.

## Constraints

- macOS-only for v1; lock via `open -a ScreenSaverEngine` (no new deps, no accessibility permissions; requires Lock Screen → Require password set to Immediately).
- Plain JavaScript in main/preload/renderer — no TypeScript, no React/Tailwind/shadcn, no build step.
- Surgical edits only; match existing naming and indentation conventions.
- No new external dependencies without explicit approval.
- Breaking changes to the `preload.js` IPC contract must be noted in the PR description.

## Notes

Decisions captured during intent capture:
- Triggers in scope: idle-timer + app-detection (both).
- App-detection behavior: lock N seconds after a flagged app becomes frontmost (not a daily budget, not immediate).
- Cancel window: the existing 2s cancel/undo window applies to all triggers (manual + automatic).
- Settings entry point: tray menu "Settings..." item opening a separate `BrowserWindow`.
- Settings tech: plain HTML/CSS/JS, hand-rolled components matching v1 style.
- Flagged-app selection: pick from currently-running apps AND/OR manually enter app names / bundle IDs.
