---
run: run-sirenguard-005
work_items: dashboard-general-section, dashboard-button-section, dashboard-triggers-section, dashboard-about-section
mode: confirm/autopilot batch
---

# Implementation Plan: Run E — Dashboard sections

## Shared

- Section modules under `renderer/sections/` initialized from `settings.js`
- `main.js`: `settings:set-launch-at-login`, `settings:get-meta`, `settings:reveal-config`, `startMinimized` hide-on-launch, tray click to reveal
- `store.js`: `getStorePath()`
- `preload.js`: `getSettings` for floating button initial styles

## Sections

1. **General** — launch at login (dedicated IPC), start minimized toggle
2. **Trigger Button** — cancel window slider, opacity slider, reset position, color swatches; live apply in `button.js` via CSS variables
3. **Triggers** — manual click row, idle/app-detection editors, add-trigger disabled
4. **About** — version, reset all with confirm, config path reveal in Finder
