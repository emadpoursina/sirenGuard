# Test Report (batch run-sirenguard-2026-003)

---

## Work Item: idle-timer-trigger

- **Date**: 2026-07-03

### Test Strategy

No automated test framework (per testing-standards.md). Verification = static checks + boot smoke test + isolated parser check. Interactive trigger firing is pending human GUI verification.

### Static Checks

- `node --check main.js`, `lock-orchestration.js`, `idle-trigger.js`, `store.js` — pass
- ReadLints on all four — no errors

### Boot Smoke Test

- First boot attempts crashed with `electron-store`/`conf` `projectName` error, then `app.whenReady` undefined.
- **Root cause**: `ELECTRON_RUN_AS_NODE=1` was set in the shell environment (exported by Cursor's CLI). This makes Electron run as pure Node, so `require('electron').app` is undefined. NOT a code defect.
- Re-ran with `env -u ELECTRON_RUN_AS_NODE bun start` (7s) — clean boot, no errors in log, no lingering process.
- `store.js` was temporarily changed to lazy-init during misdiagnosis; reverted to original eager form once the env var was confirmed as root cause.

### Isolated Parser Check

- Confirmed `ioreg -c IOHIDSystem -r -d 4` outputs `"HIDIdleTime" = <nanoseconds>`.
- Verified the regex `/"HIDIdleTime"\s*=\s*(\d+)/i` against real output: matched, parsed 207170203500 ns → 207.17 s. Correct.

### Manual Verification (PENDING — requires GUI interaction)

- [ ] With idle threshold set low (e.g. 5s) in config, leaving the machine idle arms the button after ~5s and locks after 2s.
- [ ] Moving the mouse during the 2s window cancels (no lock).
- [ ] Disabling the idle trigger in config stops it from arming (live-apply within one poll interval).
- [ ] Manual click still arms/locks and is not double-armed by the idle trigger.

### Acceptance Criteria Validation

| Criterion | Status |
|---|---|
| Polls system idle time at a sensible interval when enabled | Verified (5s setInterval) |
| Arms lock (via shared orchestration) when idle >= threshold | Verified by code path; pending GUI |
| Activity during cancel window cancels (no re-arm spam) | Implemented via `weArmed` guard + auto-cancel; pending GUI |
| Disabling stops arming (live-apply) | Verified: tick reads `getIdleTrigger()` each cycle |
| No new dependencies; idle time via no-dep mechanism | Verified: `ioreg` shell-out, no package.json changes |

### Result

Static checks, boot smoke test (with env corrected), and parser check pass. Interactive idle-trigger firing pending human verification.

---

## Work Item: app-detection-trigger

- **Date**: 2026-07-03

### Static Checks
- `node --check main.js`, `app-detection-trigger.js` — pass
- ReadLints — no errors

### Isolated Logic Check
- Replicated `runAppleScript` + `getFrontmost` + `isFlagged` in a standalone node script.
- `getFrontmost()` returned `{ name: 'Cursor', bundleId: 'com.todesktop.230313mzl4w4u92' }`.
- `isFlagged` matched on both name (case-insensitive: 'cursor') and bundleId. Result: `true`. Correct.

### Boot Smoke Test
- `env -u ELECTRON_RUN_AS_NODE bun start` (7s) — clean boot, no errors, no lingering process.
- Both triggers disabled by default; polling runs but does not arm.

### Manual Verification (PENDING — requires GUI interaction)
- [ ] Flag the frontmost app (e.g. "Cursor") with a low delay (e.g. 5s); keep it frontmost → arms after ~5s, locks after 2s.
- [ ] Switch away before the delay → no arm.
- [ ] Switch away during the 2s cancel window → cancel, no lock.
- [ ] Disable trigger or remove the flagged app → no arming (live-apply).

### Acceptance Criteria Validation
| Criterion | Status |
|---|---|
| Polls frontmost app at a sensible interval when enabled | Verified (5s setInterval) |
| Arms after configured delay when flagged app frontmost | Verified by code path + isolated logic; pending GUI |
| Switching away before delay resets timer (no lock) | Implemented via `flaggedSinceMs` reset; pending GUI |
| Switching away during cancel window cancels | Implemented (auto-cancel when not flagged); pending GUI |
| Disable / remove flagged app stops arming (live-apply) | Verified: tick reads `getAppDetectionTrigger()` each cycle |
| Matches both display name and bundle id | Verified by isolated `isFlagged` test |
| No new dependencies (osascript) | Verified: no package.json changes |

### Result
Static checks, isolated logic check, and boot smoke test pass. Interactive firing pending human verification.

---

## Work Item: settings-window

- **Date**: 2026-07-03

### Static Checks
- `node --check main.js`, `settings-preload.js`, `renderer/settings.js` — pass
- ReadLints — no errors

### Isolated Logic Check
- Verified the two `osascript` running-apps queries return parallel comma-separated lists:
  - names: `AlDente, Finder, iTerm2, Preview, V2Box, Google Chrome, MongoDB Compass, Telegram, Beeper Desktop, Windscribe, OBS, Cursor`
  - bundle ids: `com.apphousekitchen.aldente-pro, com.apple.finder, com.googlecode.iterm2, ...`
- `getRunningApps()` zips them into `[{name, bundleId}, ...]` via `split(', ')` + index zip. Logic verified by inspection against real output.

### Settings Window Self-Test
- Temporarily called `createSettingsWindow()` on boot with a `console-message` listener and auto-quit after 6s.
- Result: settings renderer loaded with NO JS errors. Only console output was the standard Electron CSP security warning (expected for unpackaged apps; same as the floating-button renderer; suppressed when packaged).
- No `render-process-gone`, no uncaught exceptions. The `settings.js` IIFE ran `getTriggerConfig()` + `getRunningApps()` (IPC round-trips) without throwing.
- Temp self-test code reverted; final boot confirmed clean.

### Boot Smoke Test
- `env -u ELECTRON_RUN_AS_NODE bun start` (6s) — clean boot, no errors, no lingering process.

### Manual Verification (PENDING — requires GUI interaction)
- [ ] Tray "Settings..." opens the window; clicking again focuses the existing window.
- [ ] Toggles/inputs reflect saved config; Save persists across app restart.
- [ ] Idle trigger enabled + low threshold → idle arms/locks (live-apply).
- [ ] Add a flagged app from the running-apps dropdown + low delay → focusing that app arms/locks.
- [ ] Manual name/bundleId entry adds to the list; Remove removes it.
- [ ] Disable trigger / remove flagged app → stops arming without restart.
- [ ] Floating button and Launch-at-Login still work unchanged.

### Acceptance Criteria Validation
| Criterion | Status |
|---|---|
| Tray "Settings..." item opens settings window | Implemented; pending GUI click |
| Idle toggle + threshold, app-detection toggle + delay + flagged list | Implemented in settings.html/js |
| Flagged-app picker: running apps + manual name/bundleId | Implemented; running-apps query verified |
| Save persists via trigger-config-store, live-apply | Implemented; triggers read config each tick |
| New settings IPC in settings-preload; noted for PR | Implemented + documented in plan |
| Existing tray items + floating button unchanged | Verified by code inspection + boot |
| No new deps; no TS; no build step | Verified |

### Result
Static checks, isolated logic check, settings-window self-test (renderer loads clean, IPC round-trips work), and boot smoke test pass. Interactive GUI flows pending human verification.
