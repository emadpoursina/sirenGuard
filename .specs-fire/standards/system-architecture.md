# System Architecture

## Overview

Siren Guard is a single-user macOS desktop utility. It runs as a menu-bar (tray) app with one always-on-top, frameless, transparent floating window containing a draggable lock button. There is no backend, network, or multi-user concern — the entire system runs within one Electron process on the user's machine.

## System Context

A single macOS user interacts with the tray icon (to toggle launch-at-login or quit) and the floating button (to trigger a screen lock after a short arm/cancel window). All state is local to the machine.

### Context Diagram

```
┌─────────────┐        ┌────────────────────┐        ┌────────────────┐
│   macOS     │◄──────►│   Siren Guard App   │──────► │  CGSession CLI  │
│   User      │  click │  (Electron process) │  exec  │  (-suspend)     │
└─────────────┘        └────────────────────┘        └────────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │ electron-store│
                        │ (local JSON)  │
                        └──────────────┘
```

### Users

- **macOS user**: The sole user of the app; interacts via tray menu and floating button.

### External Systems

- **macOS `CGSession` CLI**: Invoked via `child_process.exec` to suspend (lock) the session.
- **macOS Login Items**: Controlled via `app.setLoginItemSettings` for launch-at-login behavior (packaged app only).

## Architecture Pattern

**Pattern**: Electron main/renderer process split with a `contextBridge`-mediated IPC boundary
**Rationale**: Standard, secure Electron architecture — keeps Node/OS access (lock command, persistence) in the main process, exposes only a narrow, explicit API surface to the untrusted renderer.

## Component Architecture

### Components

#### Main Process (`main.js`)

- **Purpose**: App lifecycle, window/tray management, IPC handling, lock invocation
- **Responsibilities**: Create floating window and tray, register IPC handlers, apply launch-at-login settings
- **Dependencies**: `electron`, `store.js`, macOS `CGSession` CLI

#### Preload Bridge (`preload.js`)

- **Purpose**: Securely expose a minimal API (`window.sirenGuard`) to the renderer
- **Responsibilities**: Bridge `lock`, `savePosition`, `getPosition` calls to `ipcRenderer.invoke`
- **Dependencies**: `electron` (`contextBridge`, `ipcRenderer`)

#### Persistence (`store.js`)

- **Purpose**: Wrap `electron-store` for typed getter/setter access
- **Responsibilities**: Persist and retrieve `buttonPosition` and `launchAtLogin`
- **Dependencies**: `electron-store`

#### Renderer UI (`renderer/`)

- **Purpose**: Render the floating draggable lock button
- **Responsibilities**: Handle drag vs. click detection, arm/cancel countdown UI, call `window.sirenGuard.lock()`
- **Dependencies**: `preload.js`-exposed API only (no direct Node/Electron access)

### Component Diagram

```
renderer/button.js ──(window.sirenGuard)──► preload.js ──(ipcRenderer.invoke)──► main.js ──► store.js
                                                                                      │
                                                                                      └──► CGSession -suspend
```

## Data Flow

User clicks and holds the floating button → renderer arms a 2s countdown → on completion, renderer calls `window.sirenGuard.lock()` → preload invokes `ipcMain.handle('lock-screen')` → main process execs `CGSession -suspend`. Button drag events update position → persisted via `store.js` on `moved` window event.

```
[User click] → [renderer countdown] → [preload bridge] → [main IPC handler] → [exec CGSession -suspend]
[User drag]  → [window 'moved' event] → [setButtonPosition] → [electron-store]
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Desktop shell | Electron ^43.0.0 | Tray, windows, native OS integration |
| Renderer UI | Plain HTML/CSS/JS | Floating button UI |
| Persistence | electron-store ^11.0.2 | Button position, launch-at-login preference |
| Lock mechanism | macOS `CGSession -suspend` | Screen lock without needing accessibility permissions |
| Package manager | Bun | Install/run scripts |

## Non-Functional Requirements

### Performance

- **Startup time**: App should be ready (tray + floating window visible) within ~1s of launch
- **Lock latency**: Lock should trigger within the fixed 2s arm/cancel window, no perceptible extra delay

### Security

- Renderer runs with `contextIsolation: true` and `nodeIntegration: false` — no direct Node access
- Only a narrow, explicit IPC API (`lock`, `savePosition`, `getPosition`) is exposed via `contextBridge`
- No secrets, tokens, or credentials handled anywhere in the app

### Scalability

Not applicable — single-user, single-instance local desktop utility with no concurrency or scaling concerns.

## Constraints

- macOS-only lock logic for v1 (`CGSession -suspend`)
- No new external dependencies without explicit approval
- Plain JavaScript only — no TypeScript unless explicitly approved
- No authentication, multi-user support, cloud sync, or cross-platform lock support in v1

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Lock mechanism | `CGSession -suspend` via `child_process.exec` | Doesn't require accessibility permissions, unlike simulated key presses |
| Persistence | `electron-store` | Simple, file-backed, no database needed for a two-key preference store |
| Renderer stack | Plain HTML/CSS/JS | Avoids extra build tooling/dependencies for a tiny UI surface |
| IPC boundary | `contextBridge` + `ipcRenderer.invoke` | Electron security best practice; keeps renderer sandboxed |

---
*Generated by specs.md - fabriqa.ai FIRE Flow*
