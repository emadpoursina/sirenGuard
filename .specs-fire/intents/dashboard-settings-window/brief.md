---
id: dashboard-settings-window
title: Dashboard / Settings window
status: completed
created: 2026-07-12T00:31:00-07:00
completed_at: 2026-07-12T07:49:18.037Z
---

# Intent: Dashboard / Settings window

## Goal

Replace the current trigger-only settings window with a full dashboard window (opened from the tray) that manages general preferences, the floating trigger button's appearance and behavior, all triggers, and an about/data section. Source spec: `scratch/dashboard-spec.md`.

## Users

The single user of Siren Guard (the owner of the machine running the menu-bar utility). Opened rarely, to tweak one thing.

## Problem

Today the settings window only edits the idle and app-detection triggers. There is no UI for: launch-at-login (currently only in the tray menu), start-minimized, the cancel/grace window duration (hardcoded to 2s in `lock-orchestration.js`), button opacity, button color, resetting a dragged-off-screen button, viewing the app version, resetting all settings, or revealing the settings file. The dashboard consolidates these into one native-feeling window and gives the UI the shape for future trigger types.

## Success Criteria

- Opening "Settings…" from the tray shows a single, framed, non-always-on-top window with four sections: General, Trigger Button, Triggers, About/Data.
- Re-opening "Settings…" while open focuses the existing window (single instance) — already true, must remain true.
- General: Launch at login toggle (synced with the tray checkbox and `app.setLoginItemSettings`); Start minimized to tray toggle. Both persist.
- Trigger Button: Cancel window duration slider (default 2s, live-applies to lock-orchestration); Button opacity slider (live-applies to the floating button); Reset button position button; Button color preset swatches (live-applies to the floating button).
- Triggers: a read-only "Manual Click → Lock" row plus editable rows for the idle-timer and app-detection triggers (existing editing folded in, no regression). An "Add trigger" control is disabled/greyed with a "coming soon" label.
- About/Data: app version; "Reset all settings to default" with a plain confirm; settings file path shown as clickable text that reveals the file in Finder.
- Settings changes are broadcast live to the floating button window via `settings:changed` (no restart needed for opacity/color/cancel-window).
- Store schema migrates to `triggers: [{id, name, enabled, ...config}]` per spec, with a one-time migration of existing user data.

## Constraints

- Plain HTML/CSS/JS in renderer — no TypeScript, no frameworks.
- No new external dependencies; `electron-store` stays.
- Surgical edits to existing files; match current naming/indentation.
- macOS-only; lock via `open -a ScreenSaverEngine`.
- No accounts, no analytics/stats, no cloud sync.
- `electron-store` in `app.getPath('userData')`.
- Trigger button renderer uses `-webkit-app-region: drag`; live style changes must not break drag/click.

## Notes

Decisions confirmed with user during capture:
1. Fold existing idle + app-detection trigger editing into the new dashboard's Triggers section (no regression); add the read-only Manual Click row. Spec §3's "read-only only" is superseded by already-shipped trigger work.
2. Migrate the store to the spec's `triggers: []` array shape, including a one-time migration of existing user data and updating `idle-trigger.js` / `app-detection-trigger.js` readers.
3. Wire `cancelWindowSeconds` from the store into `lock-orchestration.js` so the slider live-changes behavior (not stored-only).
