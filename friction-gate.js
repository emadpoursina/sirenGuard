const path = require('path');
const { BrowserWindow, ipcMain } = require('electron');
const {
  getConfirmationPhrase,
  appendOverrideLog,
  setOverrideUntil,
} = require('./store');

const FRICTION_COUNTDOWN_SEC = 30;
const OVERRIDE_DURATION_MS = 60 * 60 * 1000;

let frictionWindow = null;
let pendingAction = null;
let ipcRegistered = false;

function closeFrictionWindow() {
  if (frictionWindow && !frictionWindow.isDestroyed()) {
    frictionWindow.close();
  }
  frictionWindow = null;
}

function showFrictionWindow(action) {
  closeFrictionWindow();

  frictionWindow = new BrowserWindow({
    width: 420,
    height: 320,
    resizable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    frame: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'friction-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  frictionWindow.loadFile(path.join(__dirname, 'renderer', 'friction.html'));
  frictionWindow.once('ready-to-show', () => {
    if (frictionWindow && !frictionWindow.isDestroyed()) {
      frictionWindow.show();
      frictionWindow.webContents.send('friction:init', {
        kind: action.kind,
        countdownSec: FRICTION_COUNTDOWN_SEC,
        phraseRequired: Boolean(getConfirmationPhrase()),
      });
    }
  });

  frictionWindow.on('closed', () => {
    frictionWindow = null;
    if (pendingAction && pendingAction.resolve) {
      const resolve = pendingAction.resolve;
      pendingAction = null;
      resolve(false);
    }
  });
}

function registerFrictionIpc(executeAction) {
  if (ipcRegistered) {
    return;
  }
  ipcRegistered = true;

  ipcMain.handle('friction:confirm', async (_event, payload) => {
    if (!pendingAction) {
      return { ok: false, error: 'no pending action' };
    }

    const phrase = getConfirmationPhrase();
    if (!phrase) {
      return { ok: false, error: 'phrase not configured' };
    }
    if (payload?.phrase !== phrase) {
      return { ok: false, error: 'phrase mismatch' };
    }

    const action = pendingAction;
    pendingAction = null;
    closeFrictionWindow();

    appendOverrideLog({
      kind: action.kind,
      timestamp: Date.now(),
    });

    await executeAction(action);
    if (action.resolve) {
      action.resolve(true);
    }
    return { ok: true };
  });

  ipcMain.handle('friction:cancel', () => {
    if (pendingAction && pendingAction.resolve) {
      pendingAction.resolve(false);
    }
    pendingAction = null;
    closeFrictionWindow();
    return { ok: true };
  });
}

function requestFriction(kind, payload = {}) {
  return new Promise((resolve) => {
    pendingAction = { kind, payload, resolve };
    showFrictionWindow({ kind, payload });
  });
}

async function executeFrictionAction(action, helpers = {}) {
  if (action.kind === 'override-1h') {
    setOverrideUntil(Date.now() + OVERRIDE_DURATION_MS);
    helpers.broadcastSettingsChanged?.();
    return;
  }
  if (action.kind === 'quit') {
    const { app } = require('electron');
    app.quit();
    return;
  }
  if (action.kind === 'disable-trigger') {
    const triggerId = action.payload?.triggerId;
    if (triggerId && helpers.setTriggerById) {
      helpers.setTriggerById(triggerId, { enabled: false });
      helpers.broadcastSettingsChanged?.();
    }
  }
}

module.exports = {
  registerFrictionIpc,
  requestFriction,
  executeFrictionAction,
  FRICTION_COUNTDOWN_SEC,
};
