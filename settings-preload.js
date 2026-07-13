const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sirenGuardSettings', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (partial) => ipcRenderer.invoke('settings:update', partial),
  resetButtonPosition: () => ipcRenderer.invoke('button:reset-position'),
  resetSettings: () => ipcRenderer.invoke('settings:reset'),
  setLaunchAtLogin: (enabled) => ipcRenderer.invoke('settings:set-launch-at-login', enabled),
  getMeta: () => ipcRenderer.invoke('settings:get-meta'),
  revealConfig: () => ipcRenderer.invoke('settings:reveal-config'),
  onSettingsChanged: (callback) => {
    ipcRenderer.on('settings:changed', (_event, settings) => callback(settings));
  },
  getRunningApps: () => ipcRenderer.invoke('get-running-apps'),
  requestFriction: (kind, payload) =>
    ipcRenderer.invoke('friction:request', { kind, payload }),
  uploadReminderMedia: (payload) => ipcRenderer.invoke('reminder:upload', payload),
  getReminderPreview: (filename) =>
    ipcRenderer.invoke('reminder:get-preview', filename),
});
