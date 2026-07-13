---
id: website-local-server
title: Local website-match server
intent: website-trigger
complexity: high
mode: validate
status: completed
depends_on:
  - website-detection-trigger
created: 2026-07-12T05:37:00-07:00
run_id: run-sirenguard-006
completed_at: 2026-07-12T13:06:13.254Z
---

# Work Item: Local website-match server

## Description

Run a small local server bound to `127.0.0.1` only, started from the Electron main process on `whenReady` and stopped on `will-quit`. Expose `GET /sites` (returns the configured `website-detection` `targets` so the extension can sync its match list) and `POST /site-match` (extension reports a match; server forwards it into `website-detection-trigger`). The port is stored in config (fixed default or persisted random), and a settings change triggers a re-broadcast of the site list to connected clients.

## Acceptance Criteria

- [ ] Server binds exclusively to `127.0.0.1` (never `0.0.0.0`); connection/refusal from non-localhost is rejected
- [ ] `GET /sites` returns the current `targets` array from `getWebsiteDetectionTrigger()` as JSON
- [ ] `POST /site-match` with `{ hostname, url, timestamp }` calls `website-detection-trigger.onSiteMatch(hostname, url)`; a `leave`/disconnect or no-match signal calls `onSiteLeave()` so the guard cancels when the matched tab is left
- [ ] Port is persisted via `electron-store` (new `websiteServerPort` key with a stable default) and surfaced through existing settings flow only if needed for display
- [ ] Server starts on `app.whenReady()` after triggers start, and closes cleanly on `will-quit`
- [ ] Errors (port in use, malformed payload) are logged with the `siren-guard:` prefix and do not crash the app
- [ ] No external dependencies added without approval; prefer Node's built-in `http` module for v1 (add `ws` only if a persistent push channel is required and approved)
- [ ] No secrets/tokens exposed in responses

## Technical Notes

This is the security-sensitive piece (opens a local port) — hence Validate mode and a design doc. Decision to confirm in design: HTTP long-poll vs WebSocket for push of settings changes to the extension. For v1, the extension can poll `GET /sites` on an interval (~60s), so a plain `http` server is likely sufficient and avoids a new dependency. Validate CORS behavior so the extension's service worker can fetch it. Ensure `onSiteLeave` is driven correctly (e.g. on client disconnect or an explicit `POST /site-leave`).

## Dependencies

- website-detection-trigger
