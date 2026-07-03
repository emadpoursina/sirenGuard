---
id: settings-window
title: Settings window
intent: triggers-and-settings
complexity: medium
mode: confirm
status: pending
depends_on: [trigger-config-store]
created: 2026-07-03T07:39:00-07:00
---

# Work Item: Settings window

## Description

Add a settings `BrowserWindow` (plain HTML/CSS/JS, hand-rolled, no React/Tailwind/shadcn, no build step) opened from a new "Settings..." item in the tray menu. The window reads/writes trigger config via new IPC against `trigger-config-store`, exposes a flagged-app picker (pick from currently-running apps and/or manually enter app names / bundle IDs), and applies changes live without restart.

## Acceptance Criteria

- [ ] Tray menu has a "Settings..." item above the existing separator that opens the settings window.
- [ ] Settings window shows toggle + threshold for the idle trigger and toggle + delay + flagged-apps list for the app-detection trigger.
- [ ] Flagged-app picker offers both: pick from currently-running apps, and manual entry of app name / bundle ID.
- [ ] Saving settings persists via `trigger-config-store` and changes take effect live (triggers enable/disable and re-read thresholds without restart).
- [ ] `preload.js` exposes new settings IPC (`getTriggerConfig`, `setTriggerConfig`, `getRunningApps`); changes noted in PR description.
- [ ] Existing tray items (Launch at Login, Quit) and the floating button remain unchanged.
- [ ] No new dependencies; no TypeScript; no build step.

## Technical Notes

- Running-apps list: reuse the same no-dep shell approach as `app-detection-trigger` (`osascript`/`lsappinfo`); keep the helper DRY if both need it.
- Settings window should be a normal (non-floating, non-always-on-top) window; closeable; does not affect the floating button.
- Live-apply: the trigger modules should read config on each cycle or subscribe to a config-changed event rather than caching at startup.

## Dependencies

- trigger-config-store
