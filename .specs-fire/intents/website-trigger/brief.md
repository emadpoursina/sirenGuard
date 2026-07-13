---
id: website-trigger
title: Website Trigger
status: completed
created: 2026-07-12T02:26:00-07:00
completed_at: 2026-07-12T13:06:13.302Z
---

# Intent: Website Trigger

## Goal

Extend Siren Guard's trigger system so the guard arms/locks when specific websites are visited in a browser tab (e.g. instagram.com, youtube.com/shorts) — mirroring the existing app-detection trigger, but scoped to browser tab URLs via a small browser extension that reports matches to the desktop app.

## Users

Single personal user (the project owner). Not a multi-user or published product in v1.

## Problem

Electron has no visibility into what happens inside a browser — it can see that "Chrome" is the active app, but not which tab or URL is open. Today the guard can only trigger on whole native apps (app-detection), so there is no way to trigger on a specific website. Detecting specific sites requires a browser extension that watches tab URLs and notifies the desktop app, which then fires the configured trigger action exactly like an app match.

## Success Criteria

- A Manifest V3 browser extension (Chrome/Edge/Brave) watches active tab URL changes and matches against the configured site list
- Desktop app receives match notifications from the extension and treats them identically to app-detection triggers (arm/lock per configured trigger behavior)
- A new `website` trigger type is added to the `triggers` array schema, with a `targets` hostname/pattern list
- Hostname matching supports wildcard subdomain patterns (e.g. `*.youtube.com`) in addition to explicit hostnames
- A new **Websites** section in the Dashboard mirrors the existing Apps section (add/remove/toggle rows + a hint linking to the extension install)
- Extension syncs the site list from the desktop app on load and on a periodic interval (e.g. every 60s) to stay in sync with dashboard changes
- Extension can be loaded unpacked via `chrome://extensions` for v1 (no Web Store publishing)
- Desktop app starts its local server on launch

## Constraints

- Communication: **Option B — local WebSocket/HTTP server bound to `127.0.0.1` only** (chosen for v1; simpler than Native Messaging, acceptable tradeoff for a single-user local tool)
- Desktop lock behavior stays macOS-only and uses the existing lock-orchestration path (`open -a ScreenSaverEngine`); no new lock mechanism
- Chromium browsers only for v1 (Manifest V3); Safari is out of scope
- Hostname-level matching in v1; the feature only *triggers* the guard — it does not block, redirect, or modify browser tab content
- No new external dependencies without explicit approval; plain JS in main/preload/renderer; surgical edits to existing files
- Match events from the extension flow through the same trigger pipeline as app-detection matches

## Notes

Source spec: `scratch/website-trigger-spec.md`. Out of scope for v1: Safari extension, Chrome Web Store publishing, per-path/per-tab granularity (e.g. "only Reels, not all of Instagram"), and any tab blocking/redirecting. Extension structure: `manifest.json` (MV3, permissions `tabs` + `webNavigation`, `<all_urls>` host permissions) + `background.js` service worker + `icons/`. Desktop endpoints: `GET /sites` (sync list to extension) and `POST /site-match` (extension reports a match, forwarded internally like an app-match event).
