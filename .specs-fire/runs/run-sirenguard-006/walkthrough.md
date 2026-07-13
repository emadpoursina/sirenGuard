---
run: run-sirenguard-006
intent: website-trigger
scope: wide
completed: 2026-07-12T13:06:13Z
---

# Walkthrough: Website Trigger (wide run)

## Overview

Implemented the full **Website Trigger** intent in one wide run: store schema, event-driven trigger module, dashboard UI, loopback HTTP server, and MV3 browser extension.

## What Was Built

### 1. Store schema (`website-trigger-store`)

- Added `website-detection` trigger to `defaultTriggersArray()` with `enabled`, `delaySec`, and `targets`.
- Added `getWebsiteDetectionTrigger`, `setWebsiteDetectionTrigger`, `getWebsiteTargets`, `setWebsiteTargets`.
- Extended `migrateTriggersSchema` to append `website-detection` when missing from existing array installs (idempotent).
- Added `websiteServerPort` (default `45117`) with getters/setters in `getAllSettings()`.

### 2. Website-detection trigger (`website-detection-trigger`)

- New `website-detection-trigger.js` mirrors app-detection delay gating but is event-driven via `onSiteMatch` / `onSiteLeave`.
- Wired into `main.js` `whenReady` / `will-quit` lifecycle.

### 3. Dashboard UI (`dashboard-websites-section`)

- Added **Website-detection trigger** block in `renderer/sections/triggers.js`.
- Enabled toggle, delay field, targets list (add/remove), extension install hint.
- Persists through existing `persistTriggers` / `syncFromSettings` pattern.

### 4. Local server (`website-local-server`)

- New `website-server.js` using Node `http`, bound to `127.0.0.1` only.
- Endpoints: `GET /sites`, `POST /site-match`, `POST /site-leave`, `OPTIONS` CORS preflight.
- Forwards events to `website-detection-trigger`; handles `EADDRINUSE` gracefully.

### 5. Browser extension (`browser-extension`)

- New `siren-guard-extension/` MV3 package.
- Service worker watches tab URL changes, matches hostnames (including `*.domain` wildcards).
- Polls `GET /sites` every 60s; POSTs match/leave to desktop app.

## Architecture

```
Browser Extension ──HTTP──► website-server.js ──► website-detection-trigger.js ──► lock-orchestration.js
                                    ▲
Dashboard (triggers.js) ──IPC──► store.js (targets)
```

## Files Changed

| Action | Path |
|--------|------|
| Created | `website-detection-trigger.js` |
| Created | `website-server.js` |
| Created | `siren-guard-extension/manifest.json` |
| Created | `siren-guard-extension/background.js` |
| Created | `siren-guard-extension/icons/icon.png` |
| Created | `test/website-detection-trigger.test.js` |
| Created | `test/website-server.test.js` |
| Modified | `store.js` |
| Modified | `main.js` |
| Modified | `renderer/sections/triggers.js` |
| Renamed | `test/store.test.js` → `test/00-store.test.js` |

## Decisions

- **HTTP polling over WebSocket** for v1 (per approved design doc) — no new dependencies.
- **Explicit `POST /site-leave`** rather than inferring disconnect on plain HTTP.
- **Test ordering**: renamed store tests to `00-store.test.js` to avoid Bun mock leakage from server/trigger tests.

## Verification Steps

1. **Automated**: `bun test` — 39 tests, all passing.
2. **Desktop smoke test**:
   - `bun start`
   - Open Settings → Triggers → enable Website-detection, add `instagram.com`, set delay.
   - `curl http://127.0.0.1:45117/sites` — should return targets JSON.
3. **Extension smoke test**:
   - Chrome → `chrome://extensions` → Developer mode → Load unpacked → select `siren-guard-extension/`
   - Visit a flagged site; guard should arm after delay, cancel when leaving site.
4. **Security check**: `lsof -iTCP:45117 -sTCP:LISTEN` — listener should be on `127.0.0.1` only.

## Dependencies Added

None.

## Deviations from Plan

- Legacy object-shaped trigger migration still yields 2-entry arrays; `website-detection` is appended on subsequent array migration path. Non-blocking follow-up.

---

*Run `run-sirenguard-006` completed — all 5 work items done.*
