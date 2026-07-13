const path = require('path');
const { BrowserWindow, ipcMain } = require('electron');
const { getReminderMediaDir } = require('./store');

let reminderWindow = null;
let pendingResolve = null;
let ipcRegistered = false;

function registerIpc() {
  if (ipcRegistered) {
    return;
  }
  ipcRegistered = true;

  ipcMain.handle('reminder:complete', () => {
    hideReminder();
    if (pendingResolve) {
      const resolve = pendingResolve;
      pendingResolve = null;
      resolve();
    }
    return { ok: true };
  });
}

function createReminderWindow() {
  reminderWindow = new BrowserWindow({
    fullscreen: true,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'reminder-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  reminderWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  reminderWindow.setAlwaysOnTop(true, 'screen-saver');
  reminderWindow.loadFile(
    path.join(__dirname, 'renderer', 'reminder', 'index.html')
  );
}

function buildPayload(payload = {}) {
  const mediaDir = payload.mediaDir || getReminderMediaDir();
  let mediaUrl = null;
  if (payload.mediaPath) {
    const safeName = path.basename(payload.mediaPath);
    mediaUrl = `file://${path.join(mediaDir, safeName)}`;
  }
  return {
    mediaType: payload.mediaType || null,
    mediaUrl,
    caption: payload.caption || '',
    minWatchSec: Number(payload.minWatchSec) || 10,
  };
}

function show(payload) {
  registerIpc();

  return new Promise((resolve) => {
    pendingResolve = resolve;

    if (!reminderWindow || reminderWindow.isDestroyed()) {
      createReminderWindow();
    }

    const sendPayload = () => {
      if (!reminderWindow || reminderWindow.isDestroyed()) {
        resolve();
        pendingResolve = null;
        return;
      }
      reminderWindow.show();
      reminderWindow.focus();
      reminderWindow.webContents.send('reminder:show', buildPayload(payload));
    };

    if (reminderWindow.webContents.isLoading()) {
      reminderWindow.once('ready-to-show', sendPayload);
    } else {
      sendPayload();
    }
  });
}

function hideReminder() {
  if (reminderWindow && !reminderWindow.isDestroyed()) {
    reminderWindow.hide();
  }
}

function destroyReminderWindow() {
  if (reminderWindow && !reminderWindow.isDestroyed()) {
    reminderWindow.destroy();
  }
  reminderWindow = null;
  pendingResolve = null;
}

module.exports = {
  show,
  hideReminder,
  destroyReminderWindow,
};
