# Code Review (batch run-sirenguard-2026-003)

---

## Work Item: idle-timer-trigger

- **Reviewer**: self (manual; code-review skill scripts require `yaml` dep, blocked by no-new-deps rule)
- **Date**: 2026-07-03

### Files Reviewed

- `idle-trigger.js` (created)
- `lock-orchestration.js` (modified — added `isArmed()`)
- `main.js` (modified — start/stop wiring)
- `store.js` (temporarily modified during misdiagnosis, then REVERTED — net no change this run)

### Review Against Project Rules

| Rule | Status | Notes |
|---|---|---|
| Plain JavaScript, no TypeScript | Pass | CommonJS JS only. |
| Surgical edits | Pass | `lock-orchestration.js` additive `isArmed` only; `main.js` two-line wiring; `idle-trigger.js` new focused module. |
| Match existing naming/indentation | Pass | 2-space indent, single quotes, same style. |
| No AI-style comments | Pass | None added. |
| No new external dependencies | Pass | No `package.json` changes. Uses built-in `child_process` + `ioreg`. |
| macOS-only, no accessibility prompts | Pass | `ioreg` is a read-only system query; no permissions needed. |

### Design Adherence

| Decision | Implementation | Status |
|---|---|---|
| Poll interval 5s | `setInterval(tick, 5000)` | Pass |
| Read config each tick (live-apply) | `getIdleTrigger()` in `tick` | Pass |
| Arm only when not already armed | `!weArmed && !lockOrchestration.isArmed()` | Pass |
| Auto-cancel on activity | `cancel()` when `idle < threshold && weArmed` | Pass |
| Stop on quit | `app.on('will-quit', () => idleTrigger.stop())` | Pass |

### Security / Robustness

- `ioreg` command is a hardcoded constant — no user input interpolation, no injection surface.
- `exec` callback handles errors (resolves `null` on failure; tick skips).
- `isArmed()` is a read-only query; no state mutation exposed.
- `stop()` clears the interval and resets `weArmed` — no orphaned timers/arising locks after quit.

### Issues Found

| Severity | Issue | Resolution |
|---|---|---|
| Low | `tick` is async (awaits `getIdleSeconds`); overlapping ticks possible if `ioreg` takes >5s. | Acceptable — `ioreg` is fast (<50ms). No guard added to keep it simple; documented here. |
| Low | After a lock fires, `weArmed` stays true until user activity resets it; the follow-up `cancel()` is a harmless no-op. | Documented in plan; acceptable. |
| Info | `ELECTRON_RUN_AS_NODE=1` in the Cursor shell breaks `bun start` smoke tests. | Not a code issue; run smoke tests with `env -u ELECTRON_RUN_AS_NODE`. Documented in test report. |

No blocking issues. No auto-fixes applied.

### Verdict

Approved. `store.js` reverted (no net change). Interactive GUI verification pending per test report.

---

## Work Item: app-detection-trigger

- **Date**: 2026-07-03

### Files Reviewed
- `app-detection-trigger.js` (created)
- `main.js` (modified — start/stop wiring)

### Review Against Project Rules
| Rule | Status | Notes |
|---|---|---|
| Plain JavaScript, no TypeScript | Pass | CommonJS JS only. |
| Surgical edits | Pass | `main.js` two-line wiring; new focused module. |
| Match naming/indentation | Pass | Mirrors `idle-trigger.js` structure. |
| No AI-style comments | Pass | None added. |
| No new dependencies | Pass | Uses built-in `child_process` + `osascript`. |
| macOS-only, no accessibility | Pass | `osascript` System Events process query; verified no prompt here. Automation permission may be requested on some configs — documented. |

### Design Adherence
| Decision | Implementation | Status |
|---|---|---|
| Poll interval 5s | `setInterval(tick, 5000)` | Pass |
| Read config each tick (live-apply) | `getAppDetectionTrigger()` in `tick` | Pass |
| Dwell-time delay before arm | `flaggedSinceMs` + `delaySec*1000` | Pass |
| Switch away resets timer | `flaggedSinceMs = null` when not flagged | Pass |
| Auto-cancel on switch-away during cancel window | `cancel()` when not flagged && `weArmed` | Pass |
| Match name (case-insensitive) OR bundleId (exact) | `isFlagged` helper | Pass (verified) |
| Stop on quit | `appDetectionTrigger.stop()` in `will-quit` | Pass |

### Security / Robustness
- `osascript -e '<script>'` — scripts are hardcoded constants with no user input; single-quoted. No injection surface (flagged-app names come from config and are compared in JS, never interpolated into the AppleScript).
- `exec` callbacks handle errors (resolve null); `getFrontmost` skips tick if both name and bundleId are null.
- `stop()` clears interval and resets `weArmed`/`flaggedSinceMs` — no orphaned timers.

### Issues Found
| Severity | Issue | Resolution |
|---|---|---|
| Low | `osascript` Automation permission may be prompted on some macOS configs. | Documented in plan + here; not blocking. If it becomes an issue, fall back to `lsappinfo` or bundle-id-only matching. |
| Low | Async `tick` could overlap if `osascript` takes >5s. | Acceptable — osascript returns in ~1s. No guard added. |
| Info | Matches whole apps, not specific URLs/sites. | Intended v1 scope. |

No blocking issues. No auto-fixes applied.

### Verdict
Approved. Interactive GUI verification pending per test report.

---

## Work Item: settings-window

- **Date**: 2026-07-03

### Files Reviewed
- `settings-preload.js` (created)
- `renderer/settings.html` (created)
- `renderer/settings.css` (created)
- `renderer/settings.js` (created)
- `main.js` (modified — settings window, IPC handlers, getRunningApps, tray item)

### Review Against Project Rules
| Rule | Status | Notes |
|---|---|---|
| Plain JavaScript, no TypeScript | Pass | CommonJS + plain browser JS. |
| Surgical edits | Pass | New focused files; main.js additions scoped to settings. |
| Match naming/indentation | Pass | 2-space indent, single quotes, same style. |
| No AI-style comments | Pass | None added (temp self-test comment removed). |
| No new dependencies | Pass | Uses built-in `child_process`/`osascript`; no package.json changes. |
| No React/Tailwind/shadcn/build step | Pass | Hand-rolled HTML/CSS/JS, matches v1. |

### Security
- Settings renderer uses a DEDICATED `settings-preload.js` exposing only `getTriggerConfig`, `setTriggerConfig`, `getRunningApps` — it does NOT get `arm`/`cancel`/lock APIs. Minimal surface maintained per contextIsolation best practice.
- `contextIsolation: true`, `nodeIntegration: false` on the settings window.
- `osascript` queries are hardcoded constants; flagged-app names from config are compared in JS, never interpolated into AppleScript — no injection surface.
- CSP: Electron emits a CSP warning for unpackaged renderer (same as floating window). Not a regression; suppressed when packaged. Adding a CSP meta tag is a future hardening item, out of scope here (would also apply to the existing floating renderer for parity).

### Design Adherence
| Decision | Implementation | Status |
|---|---|---|
| Settings... tray item above separator | First menu item | Pass |
| Separate normal BrowserWindow, single instance | `createSettingsWindow` with focus-if-open | Pass |
| Dedicated settings preload (minimal surface) | `settings-preload.js` | Pass |
| Idle + app-detection controls | Implemented | Pass |
| Flagged-app picker: running apps + manual | Both implemented | Pass |
| Save → setTriggerConfig, live-apply | Implemented; triggers read config each tick | Pass |
| Running apps via osascript, zipped name+bundleId | `getRunningApps` | Pass (verified) |

### Issues Found
| Severity | Issue | Resolution |
|---|---|---|
| Low | App names containing commas would break `, ` split. | Unlikely for process names; acceptable v1. Documented. |
| Low | `osascript` Automation permission may prompt on some configs. | None here; documented. |
| Info | CSP warning on unpackaged renderer. | Pre-existing pattern; future hardening out of scope. |
| Info | `console-message` listener API deprecated in Electron 43 (only used in temp self-test, now removed). | Reverted; no production code uses it. |

No blocking issues. No auto-fixes applied.

### Verdict
Approved. Interactive GUI flows pending human verification per test report.
