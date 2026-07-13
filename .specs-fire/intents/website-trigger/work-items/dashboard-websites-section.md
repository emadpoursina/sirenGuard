---
id: dashboard-websites-section
title: Dashboard Websites trigger block
intent: website-trigger
complexity: medium
mode: confirm
status: completed
depends_on:
  - website-trigger-store
created: 2026-07-12T05:37:00-07:00
run_id: run-sirenguard-006
completed_at: 2026-07-12T13:06:13.214Z
---

# Work Item: Dashboard Websites trigger block

## Description

Add a new website-detection block inside the existing Triggers section in `renderer/sections/triggers.js`, mirroring the app-detection block. It exposes an enabled toggle, a delay (seconds) field, a targets list with add/remove, and an "install the Siren Guard browser extension" hint. Persistence flows through the existing `window.dashboard.updateSettings({ triggers })` path and syncs back via `syncFromSettings`.

## Acceptance Criteria

- [ ] A new `website-trigger-row` block is rendered within `#section-triggers .section-body`, structurally parallel to `#app-trigger-row`
- [ ] Enabled toggle and delay (seconds) input bind to the `website-detection` entry's `enabled` and `delaySec`
- [ ] Targets list renders each hostname/pattern with a Remove button; count is shown next to the list header
- [ ] Add-domain input accepts a string (e.g. `youtube.com` or `*.youtube.com`), trims/lowercases it, rejects empties and duplicates (case-insensitive), then persists
- [ ] An "install the Siren Guard browser extension" hint is rendered (placeholder link/`chrome://extensions` note for v1; real install target TBD)
- [ ] `syncFromSettings` populates the block from the `website-detection` trigger entry and the `syncing` guard prevents echo-loops, matching the existing pattern
- [ ] `persistTriggers` maps the `website-detection` entry (enabled, delaySec, targets) and leaves other entries untouched
- [ ] No external dependencies; plain JS; surgical edits to `triggers.js` only (plus minimal CSS in `settings.css` if needed, reusing existing classes)

## Technical Notes

Reuse existing CSS classes (`trigger-row`, `trigger-head`, `switch`, `field`, `flagged`, `add-row`, etc.). The targets array is plain strings — no name/bundle split like `flaggedApps`. Validate input is a reasonable hostname/pattern (non-empty, no spaces) before adding; full URL parsing is not required in v1.

## Dependencies

- website-trigger-store
