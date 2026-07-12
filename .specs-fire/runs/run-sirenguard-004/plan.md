---
run: run-sirenguard-004
work_item: dashboard-shell
intent: dashboard-settings-window
mode: autopilot
---

# Implementation Plan: Dashboard window shell

## Approach

Replace trigger-only settings UI with a four-section dashboard scaffold. Bootstrap `settings.js` loads full settings via `getSettings` and exposes `window.dashboard.updateSettings`. Remove legacy trigger editing (migrated in `dashboard-triggers-section`). Increase window height for four sections.

## Files to Modify

| File | Changes |
|------|---------|
| `renderer/settings.html` | Four labelled sections in spec order |
| `renderer/settings.css` | Section layout; keep reusable control styles |
| `renderer/settings.js` | Bootstrap: load settings, updateSettings helper, saved indicator |
| `main.js` | Increase SETTINGS_HEIGHT |
