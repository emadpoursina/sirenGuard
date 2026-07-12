---
id: dashboard-shell
title: Dashboard window shell
intent: dashboard-settings-window
complexity: low
mode: autopilot
status: completed
depends_on:
  - settings-ipc-refactor
created: 2026-07-12T00:31:00-07:00
run_id: run-sirenguard-004
completed_at: 2026-07-12T07:46:47.147Z
---

# Work Item: Dashboard window shell

## Description

Restructure `renderer/settings.html` and `renderer/settings.css` into the four-section dashboard layout (General / Trigger Button / Triggers / About & Data) with section headings and shared styling. Add a small bootstrap in `renderer/settings.js` that loads the full settings object via `settings:get` on open and provides a shared `updateSettings(partial)` helper that calls `window.sirenGuardSettings.updateSettings` and shows the "Saved" indicator. No section content yet — each section is filled by its own work item. The existing idle/app-detection editing code is removed from `settings.js` in this shell step only if the Triggers section item runs immediately after; otherwise leave it in place and let `dashboard-triggers-section` migrate it.

## Acceptance Criteria

- [ ] `settings.html` has four labelled `<section>` blocks in spec order: General, Trigger Button, Triggers, About & Data.
- [ ] `settings.css` provides a clean, native-feeling layout (standard controls, no heavy branding) consistent with the existing aesthetic.
- [ ] `settings.js` loads settings via `settings:get` on DOMContentLoaded and exposes a shared `updateSettings` helper + saved indicator.
- [ ] Window opens from tray "Settings…", is framed, non-always-on-top, single-instance (existing behavior preserved).
- [ ] `bun start` opens the dashboard without console errors; empty sections render with headings only.

## Technical Notes

Keep the existing `createSettingsWindow` single-instance focus behavior in `main.js`. Window dimensions may grow to fit four sections — adjust `SETTINGS_WIDTH` / `SETTINGS_HEIGHT` constants if needed. Match the current CSS naming conventions (`kebab-case` classes, same indentation).

## Dependencies

- settings-ipc-refactor
