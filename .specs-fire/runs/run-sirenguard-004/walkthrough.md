# Walkthrough: Dashboard window shell

**Run**: run-sirenguard-004

## What Was Built

Restructured the settings window into a four-section dashboard scaffold with shared bootstrap logic for upcoming section work items.

## Changes

- **`settings.html`**: General, Trigger Button, Triggers, About & Data sections (headings only)
- **`settings.css`**: Section card layout; retained reusable control styles
- **`settings.js`**: Loads `getSettings` on DOMContentLoaded; exposes `window.dashboard.updateSettings` + saved indicator
- **`main.js`**: Window size 400×640

## Note

Legacy idle/app-detection trigger editing removed from settings UI — will be restored in `dashboard-triggers-section`.

## Next

Run E (confirm): `dashboard-general-section`, `dashboard-button-section`, `dashboard-triggers-section`, `dashboard-about-section` (some depend on `cancel-window-wiring` which is done).
