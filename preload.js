const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sirenGuard', {
  arm: () => ipcRenderer.invoke('arm'),
  cancel: () => ipcRenderer.invoke('cancel'),
  onArmedState: (callback) => {
    ipcRenderer.on('armed-state', (_event, payload) => callback(payload));
  },
  onSettingsChanged: (callback) => {
    ipcRenderer.on('settings:changed', (_event, settings) => callback(settings));
  },
  getSettings: () => ipcRenderer.invoke('settings:get'),
  savePosition: (position) => ipcRenderer.invoke('save-position', position),
  getPosition: () => ipcRenderer.invoke('get-position'),
});
