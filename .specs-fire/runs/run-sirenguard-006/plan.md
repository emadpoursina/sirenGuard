---
run: run-sirenguard-006
scope: wide
work_items: website-trigger-store, website-detection-trigger, dashboard-websites-section, website-local-server, browser-extension
mode: mixed
approved_at: 2026-07-12T13:04:00Z
---

# Implementation Plan: Website Trigger (wide run)

## Work Item: website-trigger-store

### Approach

Extend `store.js` with a `website-detection` trigger entry mirroring `app-detection`, add getters/setters, and update `migrateTriggersSchema` to append the entry when missing from existing array installs.

### Files to Modify

| File | Changes |
|------|---------|
| `store.js` | Add default entry, accessors, migration append logic |
| `test/store.test.js` | Update defaults count and add website-detection tests |

---

## Work Item: website-detection-trigger

### Approach

Create event-driven trigger module parallel to `app-detection-trigger.js`, wired in `main.js` lifecycle.

### Files to Create

| File | Purpose |
|------|---------|
| `website-detection-trigger.js` | Match/leave event handlers with delay gating |
| `test/website-detection-trigger.test.js` | Unit tests for arm/cancel logic |

### Files to Modify

| File | Changes |
|------|---------|
| `main.js` | Start/stop website-detection trigger |

---

## Work Item: dashboard-websites-section

### Approach

Add website-detection block to `renderer/sections/triggers.js` mirroring app-detection UI.

### Files to Modify

| File | Changes |
|------|---------|
| `renderer/sections/triggers.js` | Website trigger row, sync/persist |

---

## Work Item: website-local-server

### Approach

Implement loopback HTTP server per approved design doc.

### Files to Create

| File | Purpose |
|------|---------|
| `website-server.js` | GET /sites, POST /site-match, POST /site-leave |
| `test/website-server.test.js` | HTTP endpoint tests |

### Files to Modify

| File | Changes |
|------|---------|
| `store.js` | `websiteServerPort` default + accessors |
| `main.js` | Start/stop server after triggers |

### Based on Design Doc

Reference: `.specs-fire/intents/website-trigger/work-items/website-local-server-design.md`

---

## Work Item: browser-extension

### Approach

Create MV3 extension under `siren-guard-extension/` with service worker URL matching and desktop sync.

### Files to Create

| File | Purpose |
|------|---------|
| `siren-guard-extension/manifest.json` | MV3 manifest |
| `siren-guard-extension/background.js` | Tab watching, match/leave POST |
| `siren-guard-extension/icons/icon.png` | Extension icon |

---
*Plan approved — wide run execution.*
