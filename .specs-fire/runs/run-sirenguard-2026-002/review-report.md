# Code Review: lock-orchestration

- **Work item**: lock-orchestration
- **Run**: run-sirenguard-2026-002
- **Reviewer**: self (manual review; code-review skill scripts require `yaml` dep, blocked by no-new-deps rule)
- **Date**: 2026-07-03

## Files Reviewed

- `lock-orchestration.js` (created)
- `main.js` (modified)
- `preload.js` (modified)
- `renderer/button.js` (modified)

## Review Against Project Rules (`.cursor/rules/ai-rules.mdc`)

| Rule | Status | Notes |
|---|---|---|
| Plain JavaScript, no TypeScript | Pass | All files are CommonJS JS. |
| Surgical edits, no full rewrites | Pass | `main.js` edited surgically; `preload.js` and `button.js` are small single-purpose files rewritten in full only because every line changed. |
| Match existing naming/indentation | Pass | 2-space indent, single quotes, same function-naming style. |
| No AI-style comments | Pass | No narrating comments added. |
| No new external dependencies | Pass | No `package.json` changes. |
| No secrets/credentials | Pass | None present. |
| macOS-only lock via `CGSession -suspend` | Pass | Command preserved verbatim in `lock-orchestration.js`. |

## Review Against Design Doc

| Design decision | Implementation | Status |
|---|---|---|
| Countdown lives in main | `lock-orchestration.js` owns the `setTimeout` | Pass |
| Separate module (CommonJS) | `require('./lock-orchestration')` | Pass |
| `arm`/`cancel` invoke + `armed-state` event | `main.js` handlers + `webContents.send` | Pass |
| Re-arm resets timer (idempotent) | `arm()` calls `clearTimer()` first | Pass |
| Event targets floating window only | `attach(floatingWindow.webContents)` | Pass |
| `lock-screen` IPC removed | Handler and `lock` preload surface removed | Pass |
| `CANCEL_WINDOW_MS = 2000` preserved | Moved to `lock-orchestration.js` | Pass |

## Security Review

- Renderer remains sandboxed: `contextIsolation: true`, `nodeIntegration: false` unchanged.
- New IPC surface (`arm`, `cancel`, `onArmedState`) is minimal and intent-only — renderer cannot directly exec.
- `exec` of `CGSession -suspend` stays in main; command string is a constant, no interpolation of user input — no injection surface.
- `target.isDestroyed()` guard prevents sending events to a torn-down window.

## Issues Found

| Severity | Issue | Resolution |
|---|---|---|
| Low | `onArmedState` registers an `ipcRenderer.on` listener with no unsubscribe path. | Acceptable — called exactly once in `button.js` for a single long-lived window. No leak in practice. Documented here. |
| Low | `lockOrchestration.attach` overwrites any prior `target`; if the floating window is recreated (via `activate`), the new webContents is attached on `createFloatingWindow` call. | Verified: `app.on('activate')` → `createFloatingWindow()` → `attach(newWebContents)`. Correct. |

No blocking issues. No auto-fixes applied.

## Verdict

Approved for completion. Interactive GUI behavior remains pending human verification per the test report.
