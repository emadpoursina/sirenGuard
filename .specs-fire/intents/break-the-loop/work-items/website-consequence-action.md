---
id: website-consequence-action
title: Website tab-close + re-entry block action
intent: break-the-loop
complexity: medium
mode: confirm
status: completed
depends_on:
  - break-the-loop-store
created: 2026-07-13T10:51:00-07:00
run_id: run-sirenguard-008
completed_at: 2026-07-13T18:01:51.153Z
---

# Work Item: Website tab-close + re-entry block action

## Description

Implement the consequence action used by the website-detection trigger: after the reminder completes, close the matched browser tab, then start a 5-minute re-entry block for that site (hostname). During the block, a revisit of the same site triggers an immediate arm with the 2 s cancel window suppressed. Leverages the existing MV3 browser extension and local server (`website-server.js`) — add a `POST /close-tab` endpoint (localhost-only) that the main process calls to ask the extension to close the active matched tab, and a `POST /site-block` signal (or reuse `site-match`) so the extension can report revisits while the block is active.

Add an in-memory site block registry in `website-detection-trigger.js` keyed by hostname with expiry timestamps; on `onSiteMatch` for a blocked hostname, invoke the immediate-arm path.

## Acceptance Criteria

- [ ] After reminder completion, the matched tab is closed via the extension through a new localhost-only `POST /close-tab` endpoint
- [ ] A 5-minute re-entry block is recorded for the matched hostname
- [ ] While the block is active, the extension reporting a match for the same hostname triggers an immediate arm with no 2 s cancel window
- [ ] After the block expires, normal website-detection behavior resumes
- [ ] The new endpoint binds exclusively to `127.0.0.1` (consistent with `website-server.js`) and rejects non-localhost connections
- [ ] Errors (extension offline, port issues, malformed payload) are logged with the `siren-guard:` prefix and do not crash the app
- [ ] No new external dependencies; reuses Node `http` and existing extension/server infrastructure
- [ ] Extension MV3 changes are minimal and documented in the run/PR description
- [ ] Unit tests cover block registration, expiry, and "match during block → instant arm" (mock `lockOrchestration.arm`, the clock, and the server)

## Technical Notes

Reuse the existing `website-server.js` request router and the extension's service-worker messaging. Coordinate with `lock-orchestration-refactor` on the suppress-cancel entry point (same convention as the app action). If the extension cannot close a tab (e.g. tab already gone), treat as success and still start the block. CORS for the extension fetch must remain valid.

## Dependencies

- break-the-loop-store
