---
run: run-sirenguard-008
status: passed
---

# Test Report: Batch B (confirm)

## Summary

| Total | Passed | Failed |
|-------|--------|--------|
| 65 | 65 | 0 |

## Work Items

### app-consequence-action
- ✅ Quit/kill with re-entry block registry
- ✅ Blocked app → `arm({ suppressCancel: true })`
- ✅ Tests in `test/11-app-consequence-action.test.js`, `test/re-entry-block.test.js`

### website-consequence-action
- ✅ `POST/GET /close-tab` + extension poll
- ✅ Site block registry + instant arm
- ✅ Tests in `test/website-close-tab.test.js`

### disable-quit-friction
- ✅ Friction gate window + tray override/quit
- ✅ `overrideUntil` suspension across triggers
- ✅ Dashboard disable uses friction IPC

### dashboard-reminder-section
- ✅ Reminder section with upload, safe app, phrase, override log

### floating-button-drag-fix
- ✅ JS drag via `set-position` IPC; click threshold preserved
