---
work_item: triggers-schema-migrate
intent: dashboard-settings-window
created: 2026-07-12T00:35:00-07:00
mode: validate
checkpoint_1: approved
---

# Design: Triggers schema migrate to array

## Summary

Convert the persisted trigger config from an object keyed by trigger type (`triggers.idle`, `triggers.appDetection`) to an array of trigger entries (`triggers: [{id, name, enabled, ...config}]`) per `scratch/dashboard-spec.md`. Ship a one-time, idempotent migration that runs at app startup, and update both trigger readers (`idle-trigger.js`, `app-detection-trigger.js`) and the store accessors to locate entries by `id`.

## Scope

**In Scope:**
- New array shape for `triggers` in `electron-store` with `idle` and `app-detection` entries.
- One-time migration of existing user data from the object shape, at startup, before triggers start.
- Update `store.js` accessors (`getTriggerConfig`/`setTriggerConfig`, `getIdleTrigger`/`setIdleTrigger`, `getAppDetectionTrigger`/`setAppDetectionTrigger`, `getFlaggedApps`/`setFlaggedApps`).
- Update `idle-trigger.js` and `app-detection-trigger.js` to read from the array by `id`.

**Out of Scope:**
- Adding new trigger types (the "Add trigger" UI is disabled/greyed — handled by `dashboard-triggers-section`).
- The dashboard UI that consumes the new shape (handled by `dashboard-triggers-section` and `settings-ipc-refactor`).
- A `schemaVersion` field / general-purpose migration framework (see decision D2).
- Changing trigger polling intervals or lock behavior.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| D1 Migration trigger location | `main.js`, in `app.whenReady()` before `idleTrigger.start()` / `appDetectionTrigger.start()` | Triggers read config on first tick; migration must complete first. Keeps migration in the main process where the store lives and avoids renderer race conditions. |
| D2 Migration detection signal | Shape detection only: `triggers` is an object with `idle`/`appDetection` keys → migrate; is an array → skip; missing/unrecognized → reset to defaults. No `schemaVersion` field. | The two shapes are unambiguous and disjoint (object vs array). A `schemaVersion` would be more future-proof but adds a field not in the spec's data model and a framework we don't need for a single migration. Revisit if a second migration is ever required. |
| D3 Idempotency | After migration, `triggers` is an array; the detector treats arrays as already-migrated and never re-converts. No duplicate entries. | Array-shape is the terminal state; the guard is the type check itself. Survives repeated launches. |
| D4 Corrupt/unrecognized data | If `triggers` is an object lacking both `idle` and `appDetection`, log a warning and reset to defaults (don't throw). If it's a non-array/non-object, same. | App must still boot. User loses trigger settings in the corrupt case, which is acceptable for a local utility; logging aids debugging. |
| D5 Reader lookup strategy | Both readers and accessors locate a trigger entry by `id` (e.g. `triggers.find(t => t.id === 'idle')`), never by array index. | Robust against reordering and against future entries being inserted. Matches the spec's `{id, name, enabled}` identity model. |
| D6 `setTriggerConfig` semantics | Replace the whole `triggers` array (caller passes the full array). Add `setTriggerById(id, partial)` for targeted updates used by the IPC layer. | The dashboard Triggers section edits one row at a time but will write through `settings:update` (work item 4). A targeted setter avoids lost updates when two settings windows edits race; full-array replace is kept for the simple/legacy path and for `settings:reset`. |
| D7 Preserved fields per entry | `idle` → `{id:'idle', name:'Idle-timer', enabled, thresholdSec}`. `app-detection` → `{id:'app-detection', name:'App-detection', enabled, delaySec, flaggedApps}`. `name` is canonicalized from current defaults if missing. | Keeps all existing behavior intact; `name` is new (for UI display) and deterministic. |
| D8 Migration atomicity | Migration reads the store, builds the new array in memory, then calls `store.set('triggers', newArray)` once. | Single write; no partial state observable by readers since migration runs before triggers start. |

## Data Models Affected

### Modifies
- **`store.triggers`**: object `{ idle, appDetection }` → array `[{id, name, enabled, thresholdSec}, {id, name, enabled, delaySec, flaggedApps}]`. Reason: align with spec data model and enable future trigger types.

## Technical Approach

### Architecture

```
app.whenReady()
  ├─ registerIpcHandlers()
  ├─ createFloatingWindow()
  ├─ createTray()
  ├─ migrateTriggersSchema()   ← NEW: runs before triggers start
  │     ├─ read store.triggers
  │     ├─ detect shape (array → skip; object → convert; else → defaults)
  │     └─ store.set('triggers', newArray)   (single write)
  ├─ idleTrigger.start()        ← reads array via getIdleTrigger()
  └─ appDetectionTrigger.start()← reads array via getAppDetectionTrigger()

store.js
  getTriggerConfig()        → returns triggers array
  setTriggerConfig(array)   → replaces array
  getTriggerById(id)        → triggers.find(t => t.id === id)   ← NEW
  setTriggerById(id, partial)→ map over array, merge partial into matching id  ← NEW
  getIdleTrigger()          → getTriggerById('idle')            (signature unchanged)
  getAppDetectionTrigger()  → getTriggerById('app-detection')   (signature unchanged)
  getFlaggedApps()          → getAppDetectionTrigger()?.flaggedApps ?? []
```

### API / accessor changes

- `getTriggerConfig()` — returns the array (was the object).
- `setTriggerConfig(config)` — expects an array; replaces `triggers`.
- `getTriggerById(id)` — new helper.
- `setTriggerById(id, partial)` — new helper; merges `partial` into the matching entry, leaves others untouched.
- `getIdleTrigger()` / `getAppDetectionTrigger()` — signatures unchanged; internally call `getTriggerById`. Existing call sites in `idle-trigger.js` / `app-detection-trigger.js` keep working without changes to their destructuring (`config.enabled`, `config.thresholdSec`, `config.delaySec`, `config.flaggedApps` all still present on the entry).

### Migration logic (pseudocode)

```js
function migrateTriggersSchema() {
  const current = store.get('triggers');

  if (Array.isArray(current)) {
    return; // already migrated
  }

  let next;
  if (current && typeof current === 'object') {
    const idle = current.idle || {};
    const appDetection = current.appDetection || {};
    next = [
      { id: 'idle', name: 'Idle-timer', enabled: !!idle.enabled,
        thresholdSec: Number(idle.thresholdSec) || 300 },
      { id: 'app-detection', name: 'App-detection', enabled: !!appDetection.enabled,
        delaySec: Number(appDetection.delaySec) || 10,
        flaggedApps: Array.isArray(appDetection.flaggedApps) ? appDetection.flaggedApps : [] },
    ];
  } else {
    console.warn('siren-guard: unrecognized triggers shape, resetting to defaults');
    next = defaultTriggersArray();   // same as store defaults
  }

  store.set('triggers', next);
}
```

## Affected Files

| File | Action | Purpose |
|------|--------|---------|
| `store.js` | Modify | Change `triggers` default to array; update accessors; add `getTriggerById` / `setTriggerById`; add `migrateTriggersSchema` export. |
| `main.js` | Modify | Call `migrateTriggersSchema()` in `app.whenReady()` before `idleTrigger.start()` / `appDetectionTrigger.start()`. |
| `idle-trigger.js` | Unchanged (verify) | Already uses `getIdleTrigger()` and reads `config.enabled` / `config.thresholdSec` — both still present on the migrated entry. No code change needed; confirm in smoke test. |
| `app-detection-trigger.js` | Unchanged (verify) | Already uses `getAppDetectionTrigger()` and reads `config.enabled` / `config.delaySec` / `config.flaggedApps` — all still present. No code change needed; confirm in smoke test. |

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Existing users lose trigger settings if migration mis-detects. | Medium | Detection is conservative: only the exact old object shape converts; array is always skipped. Corrupt cases fall to defaults rather than throwing. Smoke-test on a real existing `config.json`. |
| A reader is called before migration completes. | High | Migration runs synchronously in `app.whenReady()` before `idleTrigger.start()` / `appDetectionTrigger.start()`. No async between them. |
| `name` field drifts if a future edit omits it. | Low | `name` is set during migration and on defaults; `setTriggerById` merges partials so an omitted `name` is preserved. UI writes full rows. |
| `setTriggerConfig(array)` called with old object shape by stale code path. | Low | Only `settings-ipc-refactor` (depends on this item) and the legacy `set-trigger-config` handler call it; the IPC refactor migrates callers. Add a runtime guard: if `setTriggerConfig` receives a non-array, log and no-op. |
| Two edits race via `setTriggerConfig` (full replace). | Low | Targeted edits go through `setTriggerById`; full replace is only used for reset and legacy. Documented in D6. |

## Implementation Checklist

- [ ] Update `store.js` `defaults.triggers` to the array shape with `idle` and `app-detection` entries (defaults: idle enabled=false/thresholdSec=300; app-detection enabled=false/delaySec=10/flaggedApps=[]).
- [ ] Add `getTriggerById(id)` and `setTriggerById(id, partial)` helpers.
- [ ] Rewrite `getTriggerConfig` to return the array; rewrite `setTriggerConfig` to accept an array (with non-array guard).
- [ ] Reimplement `getIdleTrigger`/`setIdleTrigger`/`getAppDetectionTrigger`/`setAppDetectionTrigger`/`getFlaggedApps`/`setFlaggedApps` on top of the by-id helpers (preserve existing signatures and exports).
- [ ] Add and export `migrateTriggersSchema()` in `store.js`.
- [ ] Call `migrateTriggersSchema()` in `main.js` `app.whenReady()` before `idleTrigger.start()` / `appDetectionTrigger.start()`.
- [ ] Verify `idle-trigger.js` and `app-detection-trigger.js` need no changes (smoke test arm/cancel for both).
- [ ] Manual test: seed an old-shape `config.json`, launch, confirm it becomes the array and triggers still fire; relaunch, confirm no re-migration/duplication.
- [ ] Manual test: corrupt `triggers` value (e.g. a string) → app boots, resets to defaults, logs a warning.

---
*Generated by specs.md - fabriqa.ai FIRE Flow | Checkpoint 1 approved: 2026-07-12T00:35:00-07:00*
