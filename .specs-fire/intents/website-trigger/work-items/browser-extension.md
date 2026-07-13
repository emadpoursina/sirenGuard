---
id: browser-extension
title: Browser extension (MV3)
intent: website-trigger
complexity: medium
mode: confirm
status: completed
depends_on:
  - website-local-server
created: 2026-07-12T05:37:00-07:00
run_id: run-sirenguard-006
completed_at: 2026-07-12T13:06:13.295Z
---

# Work Item: Browser extension (MV3)

## Description

Create a small Manifest V3 browser extension (Chrome/Edge/Brave) under a new `siren-guard-extension/` directory. The service worker watches active tab URL changes, syncs the configured `targets` list from the desktop app's `GET /sites` on load and on a ~60s interval, matches the active tab's hostname against targets (including `*.domain` wildcard patterns), and POSTs `site-match` to the desktop app when matched (and a `leave` signal when the tab moves off a matched site).

## Acceptance Criteria

- [ ] `siren-guard-extension/manifest.json` is Manifest V3 with `tabs` + `webNavigation` permissions, `<all_urls>` host permissions, and `background.js` as the service worker
- [ ] `background.js` listens to `chrome.tabs.onUpdated` and `chrome.tabs.onActivated`, extracts the active tab's hostname, and evaluates it against the cached targets
- [ ] Matching supports both explicit hostnames (`instagram.com`, `www.instagram.com`) and wildcard subdomain patterns (`*.youtube.com` matches `music.youtube.com`)
- [ ] On match: `POST {hostname, url, timestamp}` to the configured desktop endpoint; on transition off a matched site: sends a leave signal so the desktop guard cancels
- [ ] Targets are fetched from `GET /sites` on startup and refreshed on a ~60s interval; cached locally so matching works between refreshes
- [ ] The desktop endpoint base URL (e.g. `http://127.0.0.1:PORT`) is configurable in the extension (constant or simple options page for v1)
- [ ] `icons/` contains at least one icon referenced by the manifest
- [ ] Loads unpacked via `chrome://extensions` (Developer mode) with no errors; no Web Store publishing for v1
- [ ] No external JS dependencies; plain browser-extension JS

## Technical Notes

Keep the service worker stateless across restarts where possible (re-fetch `/sites` on `onStartup`/`onInstalled` and on the interval). Wildcard matching: a target `*.example.com` matches any `sub.example.com` but not `example.com` itself unless `example.com` is also listed. Handle service-worker suspension (MV3 may tear down the worker) by re-deriving state from the tab + cached targets on wake. Leave-signal design must match whatever `website-local-server` expects (coordinate with that work item's contract).

## Dependencies

- website-local-server
