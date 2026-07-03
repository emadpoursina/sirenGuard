---
work_item: lock-orchestration
intent: triggers-and-settings
created: 2026-07-03T07:41:00-07:00
mode: validate
checkpoint_1: approved
---

# Design: Lock/cancel orchestration refactor

## Summary

Promote the 2-second arm -> countdown -> lock-or-cancel flow from the renderer into a shared main-process state machine (`lock-orchestration.js`) so that any trigger — the existing manual click, plus the upcoming idle-timer and app-detection triggers — can initiate the same cancel window. The renderer becomes a thin view that requests `arm`/`cancel` over IPC and reflects armed state from main-pushed events.

## Scope

**In Scope:**
- New `lock-orchestration.js` module owning the countdown state machine and `lockScreen()` call.
- New IPC: `arm` (invoke), `cancel` (invoke), `armed-state` event (main -> renderer).
- Migrate `renderer/button.js` to call `arm`/`cancel` and drive visuals from `armed-state` events.
- Remove the now-internal `lock-screen` IPC handler and `window.sirenGuard.lock` surface.

**Out of Scope:**
- Idle-timer and app-detection triggers (separate work items; they consume this module).
- Settings window.
- Any change to lock command (`CGSession -suspend`), button position, or launch-at-login.
- Automated tests (project has no test framework; manual smoke test only).

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where the countdown lives | Main process (`lock-orchestration.js`) | Automatic triggers fire from main; a single owner avoids duplicating the cancel window in two processes and guarantees identical behavior for manual + automatic triggers. |
| Module vs. inline in `main.js` | Separate `lock-orchestration.js` (CommonJS) | Single responsibility; trigger modules can `require` it without going through IPC; keeps `main.js` focused on lifecycle/windows. |
| IPC style for arming | `ipcRenderer.invoke('arm'/'cancel')` + `webContents.send('armed-state')` | Matches existing `invoke` pattern; main-pushed event keeps renderer visuals in sync regardless of who armed. |
| Re-arm semantics | `arm()` while armed resets the 2s timer (idempotent) | Prevents overlapping timers from rapid trigger firing; one active countdown at a time. |
| Event targeting | Send `armed-state` only to the floating window's `webContents` | The future settings window must not receive armed-state pulses; avoids cross-window noise. |
| `lock-screen` IPC handler | Removed; lock becomes internal to orchestration | The renderer no longer triggers a bare lock; unify on `arm`. Breaking IPC change — noted in PR description per constitution. |
| Countdown duration | Keep `CANCEL_WINDOW_MS = 2000` (move constant to orchestration module) | Preserve v1 timing exactly; single source of truth. |

## Data Models Affected

No persisted data changes. In-memory state introduced in `lock-orchestration.js`:

- **ArmState** (module-private): `{ armed: boolean, timer: NodeJS.Timeout | null }` — single instance, not persisted.

## Technical Approach

### Architecture

```
renderer/button.js
  short click         ──► window.sirenGuard.arm()
  click while armed   ──► window.sirenGuard.cancel()
  ◄── 'armed-state' { armed: true|false }   (toggles .armed class + ring)

preload.js  (window.sirenGuard)
  arm()        ──► ipcRenderer.invoke('arm')
  cancel()     ──► ipcRenderer.invoke('cancel')
  onArmedState(cb) ──► ipcRenderer.on('armed-state', (_e, p) => cb(p))

main.js
  ipcMain.handle('arm',    () => orchestration.arm())
  ipcMain.handle('cancel', () => orchestration.cancel())
  floatingWindow ready ──► orchestration.attach(floatingWindow.webContents)

lock-orchestration.js  (new)
  attach(webContents)   // store target for armed-state events
  arm()                 // clear any timer; emit armed=true; start 2s timer
                        //   on expiry: lockScreen() + emit armed=false
  cancel()              // clear timer; emit armed=false
  lockScreen()          // exec open -a ScreenSaverEngine (moved from main.js)
```

### IPC contract change (preload.js)

Removed: `lock()`, `lock-screen` handler.
Added: `arm()`, `cancel()`, `onArmedState(cb)`. Event channel name: `'armed-state'`.

## Affected Files

| File | Action | Purpose |
|------|--------|---------|
| `lock-orchestration.js` | Create | Own arm/cancel state machine + `lockScreen()` |
| `main.js` | Modify | Replace `lock-screen` handler with `arm`/`cancel`; call `orchestration.attach`; remove inline `lockScreen`/`LOCK_COMMAND` |
| `preload.js` | Modify | Replace `lock` with `arm`/`cancel`/`onArmedState` |
| `renderer/button.js` | Modify | Drop local `setTimeout` countdown; call `arm`/`cancel`; drive visuals from `onArmedState` |
| `renderer/index.html` | No change | Markup unchanged |
| `renderer/style.css` | No change | `.armed`/ring styles reused as-is |

## Security Considerations

- **Renderer still sandboxed**: `contextIsolation: true`, `nodeIntegration: false` unchanged. New IPC surface stays minimal and explicit via `contextBridge`.
- **No new Node access exposed**: `arm`/`cancel` are intent calls; the renderer cannot directly exec anything. Actual `exec` of `open -a ScreenSaverEngine` stays in main (`lock-orchestration.js`).

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Regression to v1 manual click (core feature) | High | Preserve `CANCEL_WINDOW_MS=2000` and click-threshold logic in renderer; manual smoke test of click->lock and click->cancel before commit. |
| Missed `armed-state` event leaves button visually stuck armed | Medium | Always emit `armed=false` on both lock-expiry and cancel; renderer also calls `cancel` on a click-while-armed, which re-emits idle. |
| Rapid `arm` calls create multiple timers | Medium | `arm()` clears any existing timer before starting a new one; single timer invariant. |
| Future settings window receives armed pulses | Low | `attach(webContents)` scopes `send` to the floating window only. |
| Breaking `preload.js` IPC change (`lock` removed) | Low | Document in PR description (constitution requirement); no other consumers exist. |

## Implementation Checklist

- [ ] Create `lock-orchestration.js` with `attach`, `arm`, `cancel`, internal `lockScreen`, and `CANCEL_WINDOW_MS` constant.
- [ ] In `main.js`: `require('./lock-orchestration')`, replace `lock-screen` handler with `arm`/`cancel` handlers, call `orchestration.attach(floatingWindow.webContents)` after window creation, remove inline `LOCK_COMMAND`/`lockScreen`.
- [ ] In `preload.js`: replace `lock` with `arm`, `cancel`, and `onArmedState(cb)` (wrapping `ipcRenderer.on('armed-state')`).
- [ ] In `renderer/button.js`: remove local countdown timer; on short click call `arm()` (or `cancel()` if currently armed); subscribe to `onArmedState` to toggle `.armed` class and `countdownRing.hidden`.
- [ ] Manually smoke test via `bun start`: short click arms + locks after 2s; second click during window cancels; drag still works; position still persists.
- [ ] Note the `preload.js` IPC contract change in the PR description.

---
*Generated by specs.md - fabriqa.ai FIRE Flow | Checkpoint 1 approved: 2026-07-03T07:41:00-07:00*
