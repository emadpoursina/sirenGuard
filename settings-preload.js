const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sirenGuardSettings', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (partial) => ipcRenderer.invoke('settings:update', partial),
  resetButtonPosition: () => ipcRenderer.invoke('button:reset-position'),
  resetSettings: () => ipcRenderer.invoke('settings:reset'),
  onSettingsChanged: (callback) => {
    ipcRenderer.on('settings:changed', (_event, settings) => callback(settings));
  },
  getTriggerConfig: () => ipcRenderer.invoke('get-trigger-config'),
  setTriggerConfig: (config) => ipcRenderer.invoke('set-trigger-config', config),
  getRunningApps: () => ipcRenderer.invoke('get-running-apps'),
});
