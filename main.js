const path = require('path');
const { exec } = require('child_process');
const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  ipcMain,
  nativeImage,
} = require('electron');
const {
  getButtonPosition,
  setButtonPosition,
  getLaunchAtLogin,
  setLaunchAtLogin,
} = require('./store');

const LOCK_COMMAND =
  '/System/Library/CoreServices/Menu Extras/User.menu/Contents/Resources/CGSession -suspend';

const WINDOW_WIDTH = 64;
const WINDOW_HEIGHT = 64;

let tray = null;
let floatingWindow = null;

function lockScreen() {
  exec(`"${LOCK_COMMAND}"`);
}

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

  floatingWindow.on('moved', () => {
    if (!floatingWindow) return;
    const [x, y] = floatingWindow.getPosition();
    setButtonPosition({ x, y });
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
      label: 'Launch at Login',
      type: 'checkbox',
      checked: launchAtLogin,
      enabled: app.isPackaged,
      click: (menuItem) => {
        const applied = applyLaunchAtLogin(menuItem.checked);
        if (!applied) {
          menuItem.checked = getLaunchAtLoginState();
          tray.setContextMenu(buildTrayMenu());
        }
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
}

function registerIpcHandlers() {
  ipcMain.handle('lock-screen', () => {
    lockScreen();
  });

  ipcMain.handle('save-position', (_event, position) => {
    setButtonPosition(position);
  });

  ipcMain.handle('get-position', () => {
    return getButtonPosition();
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createFloatingWindow();
  createTray();

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
