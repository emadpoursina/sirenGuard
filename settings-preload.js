const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sirenGuardSettings', {
  getTriggerConfig: () => ipcRenderer.invoke('get-trigger-config'),
  setTriggerConfig: (config) => ipcRenderer.invoke('set-trigger-config', config),
  getRunningApps: () => ipcRenderer.invoke('get-running-apps'),
});
