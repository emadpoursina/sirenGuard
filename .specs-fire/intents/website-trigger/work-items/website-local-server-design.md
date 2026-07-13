---
work_item: website-local-server
intent: website-trigger
created: 2026-07-12T05:48:00-07:00
mode: validate
checkpoint_1: approved
---

# Design: Local website-match server

## Summary

A tiny HTTP server, bound exclusively to `127.0.0.1`, that bridges the Siren Guard browser extension and the existing trigger pipeline. The extension polls `GET /sites` to sync its match list and POSTs match/leave events; the server forwards those into `website-detection-trigger`, which arms/cancels `lock-orchestration` exactly like app-detection does. Uses only Node's built-in `http` module — no new dependencies.

## Scope

**In Scope:**
- New `website-server.js` module (Node `http`, bound to `127.0.0.1`)
- Endpoints: `GET /sites`, `POST /site-match`, `POST /site-leave`, `OPTIONS` preflight
- `websiteServerPort` persisted via `electron-store` (stable default)
- Lifecycle wiring in `main.js` (start after triggers on `whenReady`, close on `will-quit`)
- CORS headers so the extension's MV3 service worker can `fetch` it
- Forwarding contract to `website-detection-trigger.onSiteMatch()` / `onSiteLeave()`

**Out of Scope:**
- WebSocket / persistent push channel (v1 uses polling; revisit if push becomes needed)
- Any auth token / shared secret (localhost-only, single user, no secrets — see Security)
- Publishing port choice to the Dashboard UI (port stored, not displayed in v1)
- TLS (plain HTTP on loopback is sufficient; no certs on localhost)
- Per-tab/per-path matching (hostname-level only, handled by the extension)

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Transport | Plain HTTP via Node built-in `http` | Avoids new dependency (`ws`); extension can poll `/sites` ~60s. Matches tech-stack constraint of no new deps without approval. |
| Push of settings changes | None — extension polls `GET /sites` | Eliminates WebSocket complexity and connection-state bookkeeping. ~60s sync latency is acceptable for a personal tool; targets change rarely. |
| Bind address | `127.0.0.1` only (never `0.0.0.0`) | Loopback-only is the entire security model; never expose on LAN. `http.createServer` given host `127.0.0.1` rejects non-loopback connections at the OS layer. |
| Port | Persisted `websiteServerPort` with stable default (`45117`) | Stable port so the extension's configured base URL stays valid across restarts; persisted so a user override survives. Falls back gracefully if in use (see Risks). |
| Leave signal | Explicit `POST /site-leave` from extension | Plain HTTP has no reliable "disconnect" event. An explicit leave call mirrors the match call and is unambiguous; the extension sends it when the active tab moves off a matched site. |
| CORS | `Access-Control-Allow-Origin: *` + `OPTIONS` preflight handler | Server is loopback-only with no secrets; `*` is simplest and lets any Chromium extension fetch without maintaining an allow-list of extension IDs. `OPTIONS` returns 204 with CORS headers. |
| Auth | None | Localhost-only, single user, no secrets in responses. Adding a token would require a secret-sharing step with the extension that v1 doesn't need. Documented as accepted risk (see Security). |
| Module name | `website-server.js` | Follows coding-standards: main-process files are lowercase, no dashes (`store.js`, `preload.js`). |
| Response shape for `/sites` | `{ "targets": [...] }` object (not bare array) | Extensible — can add `version`/`enabled` later without breaking the extension. |
| Settings-change broadcast | Not needed in v1 | `/sites` reads fresh from `store` on every request, so polling always sees current config. No push channel required. |

## Data Models Affected

### Modifies
- **`store.js` config**: adds `websiteServerPort` (number, default `45117`) to `electron-store` defaults and `getAllSettings()`; new `getWebsiteServerPort()` / `setWebsiteServerPort()` accessors (mirrors existing getter/setter pattern).

## Technical Approach

### Architecture

```
┌────────────────────────┐        HTTP (127.0.0.1:45117)        ┌──────────────────────────┐
│  Browser Extension     │  GET /sites        (poll ~60s)       │  website-server.js       │
│  (MV3 service worker)  │ ───────────────────────────────────► │  (Node http, loopback)   │
│                        │  POST /site-match  {hostname,url,ts} │                          │
│                        │ ───────────────────────────────────► │   GET  /sites  → store   │
│                        │  POST /site-leave  {hostname,url,ts} │   POST /site-match       │
│                        │ ───────────────────────────────────► │     → website-detection- │
└────────────────────────┘                                     │       trigger.onSiteMatch│
                                                                │   POST /site-leave       │
                                                                │     → ...onSiteLeave     │
                                                                └──────────┬───────────────┘
                                                                           │
                                                                           ▼
                                                                ┌──────────────────────────┐
                                                                │ website-detection-trigger│
                                                                │  (delay gating, armed)   │
                                                                └──────────┬───────────────┘
                                                                           ▼
                                                                ┌──────────────────────────┐
                                                                │ lock-orchestration.js    │
                                                                │  → open -a ScreenSaver.. │
                                                                └──────────────────────────┘
```

### API Changes

Local HTTP contract (base URL: `http://127.0.0.1:{websiteServerPort}`) — also consumed by work item `browser-extension`:

- `GET /sites` → `200` `{ "targets": ["instagram.com", "*.youtube.com", ...] }` — reads `getWebsiteDetectionTrigger().targets` fresh on each call
- `POST /site-match` body `{ "hostname": string, "url": string, "timestamp": number }` → `200` `{ "ok": true }` — validates `hostname` non-empty string; calls `website-detection-trigger.onSiteMatch(hostname, url)`; `400` on malformed body
- `POST /site-leave` body `{ "hostname"?: string, "url"?: string, "timestamp": number }` → `200` `{ "ok": true }` — calls `website-detection-trigger.onSiteLeave()`
- `OPTIONS *` → `204` with CORS headers (preflight)
- All responses include: `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: GET, POST, OPTIONS`, `Access-Control-Allow-Headers: Content-Type`, and `Content-Type: application/json` (for non-204)

### Data Flow

```
[Extension: tab URL changed] → POST /site-match → website-server → onSiteMatch(hostname,url)
  → website-detection-trigger records match, after delaySec arms → lock-orchestration.arm() → exec ScreenSaverEngine

[Extension: tab moved off matched site] → POST /site-leave → website-server → onSiteLeave()
  → website-detection-trigger cancels (if it armed) → lock-orchestration.cancel()

[Dashboard edits targets] → settings:update → store.set('triggers')
  → next GET /sites (within ≤60s) returns updated targets → extension updates its match list
```

## Affected Files

| File | Action | Purpose |
|------|--------|---------|
| `website-server.js` | Create | New local HTTP server module (`start`, `stop`) |
| `store.js` | Modify | Add `websiteServerPort` default + getters/setters; include in `getAllSettings()` |
| `main.js` | Modify | `require('./website-server')`, start after triggers in `whenReady`, stop in `will-quit` |

## Security Considerations

- **Loopback-only binding**: Server created with `http.createServer().listen(port, '127.0.0.1')`. OS rejects non-loopback connections. Never bind `0.0.0.0` or omit the host arg.
- **No secrets in responses**: `/sites` returns only hostname strings the user configured; match/leave responses are `{ ok: true }`. No tokens, file paths, or user data.
- **No auth token (accepted risk)**: Any local process could call `/site-match` and arm the guard. Impact is limited to a false lock trigger (denial of screen, not data exposure). For a single-user personal tool this is acceptable; revisit if the app is ever distributed.
- **CORS `*` is safe here**: The server has no secrets and is loopback-only; `*` lets the extension fetch without an extension-ID allow-list. No credentials are ever sent, so `Access-Control-Allow-Credentials` is never set.
- **Payload validation**: Reject malformed JSON / missing `hostname` with `400`; never let a bad payload throw into the request handler (wrap in try/catch, log with `siren-guard:` prefix).

## Integration Points

| System | Type | Purpose |
|--------|------|---------|
| `website-detection-trigger` | `require()` (main process) | Forward match/leave events |
| `store.js` | `require()` (main process) | Read `targets` and `websiteServerPort` |
| `main.js` lifecycle | Function calls | `start()` on `whenReady`, `stop()` on `will-quit` |
| Browser extension (work item `browser-extension`) | HTTP over loopback | Consumer of `/sites`, producer of `/site-match` + `/site-leave` |

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Default port `45117` already in use by another app | Medium — website trigger silently unavailable | On `listen` `EADDRINUSE`, log `siren-guard: website-server port N in use` and leave server stopped (app + other triggers keep working). Do not crash. Optionally try one fallback port and persist the working one. |
| Another local process sends `/site-match` and triggers a false lock | Low — annoyance, not data exposure | Accepted for v1 (single-user). Document. If hardened later, add a token written to a file the extension reads. |
| Extension misses sending `/site-leave` (e.g. service worker suspended) → guard stays armed | Medium — user gets locked unexpectedly | `website-detection-trigger` owns delay gating and `weArmed`; a stale match without a leave will still arm. Mitigation: extension re-sends match state on wake; also consider a server-side idle timeout for matches (out of scope for this work item — flag for `browser-extension`). |
| Non-localhost reachability if host arg ever omitted | High — security regression | Code review gate (validate mode) + explicit `'127.0.0.1'` literal in `listen()` call. Add a post-listen assertion that `address().address === '127.0.0.1'`. |
| Malformed payload throws inside handler | Low — request error, no crash | Wrap handler body in try/catch; respond `400`/`500`; log with `siren-guard:` prefix. |
| `will-quit` doesn't close server cleanly → port lingers | Low — next launch hits EADDRINUSE | Call `server.close()` in `will-quit`; `close()` is idempotent. |

## Implementation Checklist

- [ ] Add `websiteServerPort` (default `45117`) to `store.js` defaults + `getAllSettings()`; add `getWebsiteServerPort` / `setWebsiteServerPort`; export them
- [ ] Create `website-server.js`: `start({ port })` creates `http.createServer` bound to `127.0.0.1`, `stop()` closes it; idempotent both ways
- [ ] Implement route handling: `GET /sites`, `POST /site-match`, `POST /site-leave`, `OPTIONS *` (204 preflight); 404 for anything else
- [ ] Add CORS headers on all responses; validate `hostname` on match; try/catch every handler; log errors with `siren-guard:` prefix
- [ ] Wire `website-detection-trigger.onSiteMatch`/`onSiteLeave` into the match/leave handlers
- [ ] Post-listen assertion: `server.address().address === '127.0.0.1'` (fail loud if not loopback)
- [ ] Handle `EADDRINUSE`: log and leave server stopped without crashing
- [ ] In `main.js`: `require('./website-server')`, call `websiteServer.start({ port: getWebsiteServerPort() })` after `appDetectionTrigger.start()` in `whenReady`; call `websiteServer.stop()` in `will-quit`
- [ ] Manual smoke test: `bun start`, `curl http://127.0.0.1:45117/sites`, `curl -X POST .../site-match`, confirm arm/cancel flows through; confirm `netstat`/`lsof` shows listener only on `127.0.0.1`
- [ ] Confirm no new dependencies added to `package.json`

---
*Generated by specs.md - fabriqa.ai FIRE Flow | Checkpoint 1 approved: 2026-07-12T05:49:00-07:00*
