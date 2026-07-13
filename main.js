const path = require('path');
const { exec } = require('child_process');
const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  ipcMain,
  nativeImage,
  shell,
} = require('electron');
const {
  getButtonPosition,
  setButtonPosition,
  getLaunchAtLogin,
  setLaunchAtLogin,
  migrateTriggersSchema,
  getAllSettings,
  updateSettings,
  resetSettings,
  getStartMinimized,
  getStorePath,
} = require('./store');
const lockOrchestration = require('./lock-orchestration');
const idleTrigger = require('./idle-trigger');
const appDetectionTrigger = require('./app-detection-trigger');
const websiteDetectionTrigger = require('./website-detection-trigger');
const websiteServer = require('./website-server');

const WINDOW_WIDTH = 64;
const WINDOW_HEIGHT = 64;

const SETTINGS_WIDTH = 400;
const SETTINGS_HEIGHT = 780;
const RUNNING_APPS_NAME_QUERY =
  'tell application "System Events" to get name of every process whose background only is false';
const RUNNING_APPS_BUNDLE_QUERY =
  'tell application "System Events" to get bundle identifier of every process whose background only is false';

const DEFAULT_BUTTON_POSITION = { x: 100, y: 100 };

let tray = null;
let floatingWindow = null;
let settingsWindow = null;

function createFloatingWindow() {
  const position = getButtonPosition();

  floatingWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    x: position.x,
    y: position.y,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  floatingWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  floatingWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  lockOrchestration.attach(floatingWindow.webContents);

  floatingWindow.on('moved', () => {
    if (!floatingWindow) return;
    const [x, y] = floatingWindow.getPosition();
    setButtonPosition({ x, y });
  });

  if (getStartMinimized()) {
    floatingWindow.hide();
  }
}

function showFloatingWindow() {
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    floatingWindow.show();
  }
}

function runAppleScript(script) {
  return new Promise((resolve) => {
    exec(`osascript -e '${script}'`, (err, stdout) => {
      if (err) {
        resolve(null);
        return;
      }
      resolve(stdout.trim());
    });
  });
}

async function getRunningApps() {
  const [namesCsv, bundlesCsv] = await Promise.all([
    runAppleScript(RUNNING_APPS_NAME_QUERY),
    runAppleScript(RUNNING_APPS_BUNDLE_QUERY),
  ]);

  if (!namesCsv && !bundlesCsv) {
    return [];
  }

  const names = namesCsv ? namesCsv.split(', ') : [];
  const bundles = bundlesCsv ? bundlesCsv.split(', ') : [];
  const count = Math.max(names.length, bundles.length);
  const apps = [];
  for (let i = 0; i < count; i++) {
    apps.push({
      name: names[i] || null,
      bundleId: bundles[i] || null,
    });
  }
  return apps;
}

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: SETTINGS_WIDTH,
    height: SETTINGS_HEIGHT,
    resizable: false,
    minimizable: false,
    maximizable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'settings-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  settingsWindow.loadFile(path.join(__dirname, 'renderer', 'settings.html'));
  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show();
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

function applyLaunchAtLogin(enabled) {
  if (!app.isPackaged) {
    return false;
  }

  try {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: true,
    });
    setLaunchAtLogin(enabled);
    return true;
  } catch {
    return false;
  }
}

function getLaunchAtLoginState() {
  if (!app.isPackaged) {
    return getLaunchAtLogin();
  }

  try {
    return app.getLoginItemSettings().openAtLogin;
  } catch {
    return getLaunchAtLogin();
  }
}

function buildTrayMenu() {
  const launchAtLogin = getLaunchAtLoginState();

  return Menu.buildFromTemplate([
    {
      label: 'Settings…',
      click: () => {
        createSettingsWindow();
      },
    },
    { type: 'separator' },
    {
      label: 'Launch at Login',
      type: 'checkbox',
      checked: launchAtLogin,
      enabled: app.isPackaged,
      click: (menuItem) => {
        const applied = applyLaunchAtLogin(menuItem.checked);
        if (!applied) {
          menuItem.checked = getLaunchAtLoginState();
        }
        tray.setContextMenu(buildTrayMenu());
        broadcastSettingsChanged();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  const icon = nativeImage.createFromPath(iconPath);

  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  tray.setToolTip('Siren Guard');
  tray.setContextMenu(buildTrayMenu());
  tray.on('click', () => {
    showFloatingWindow();
  });
}

function broadcastSettingsChanged() {
  const settings = getAllSettings();
  [floatingWindow, settingsWindow].forEach((win) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('settings:changed', settings);
    }
  });
}

function registerIpcHandlers() {
  ipcMain.handle('arm', () => {
    lockOrchestration.arm();
  });

  ipcMain.handle('cancel', () => {
    lockOrchestration.cancel();
  });

  ipcMain.handle('save-position', (_event, position) => {
    setButtonPosition(position);
  });

  ipcMain.handle('get-position', () => {
    return getButtonPosition();
  });

  ipcMain.handle('get-running-apps', async () => {
    return getRunningApps();
  });

  ipcMain.handle('settings:get', () => {
    return {
      ...getAllSettings(),
      launchAtLogin: getLaunchAtLoginState(),
    };
  });

  ipcMain.handle('settings:update', (_event, partial) => {
    updateSettings(partial);
    broadcastSettingsChanged();
    return getAllSettings();
  });

  ipcMain.handle('button:reset-position', () => {
    setButtonPosition(DEFAULT_BUTTON_POSITION);
    if (floatingWindow && !floatingWindow.isDestroyed()) {
      floatingWindow.setPosition(
        DEFAULT_BUTTON_POSITION.x,
        DEFAULT_BUTTON_POSITION.y
      );
    }
    broadcastSettingsChanged();
    return getAllSettings();
  });

  ipcMain.handle('settings:reset', () => {
    resetSettings();
    migrateTriggersSchema();
    if (floatingWindow && !floatingWindow.isDestroyed()) {
      const position = getButtonPosition();
      floatingWindow.setPosition(position.x, position.y);
    }
    if (tray) {
      tray.setContextMenu(buildTrayMenu());
    }
    broadcastSettingsChanged();
    return getAllSettings();
  });

  ipcMain.handle('settings:set-launch-at-login', (_event, enabled) => {
    const applied = applyLaunchAtLogin(Boolean(enabled));
    if (!applied && !app.isPackaged) {
      return { applied: false, launchAtLogin: getLaunchAtLogin() };
    }
    if (tray) {
      tray.setContextMenu(buildTrayMenu());
    }
    broadcastSettingsChanged();
    return { applied: true, launchAtLogin: getLaunchAtLoginState() };
  });

  ipcMain.handle('settings:get-meta', () => {
    return {
      version: app.getVersion(),
      configPath: getStorePath(),
      isPackaged: app.isPackaged,
    };
  });

  ipcMain.handle('settings:reveal-config', () => {
    shell.showItemInFolder(getStorePath());
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createFloatingWindow();
  createTray();
  migrateTriggersSchema();
  idleTrigger.start();
  appDetectionTrigger.start();
  websiteDetectionTrigger.start();
  websiteServer.start();

  if (app.isPackaged && getLaunchAtLogin()) {
    applyLaunchAtLogin(true);
  }

  app.on('activate', () => {
    if (!floatingWindow) {
      createFloatingWindow();
    }
  });
});

app.on('window-all-closed', (event) => {
  event.preventDefault();
});

app.on('will-quit', () => {
  idleTrigger.stop();
  appDetectionTrigger.stop();
  websiteDetectionTrigger.stop();
  websiteServer.stop();
});
