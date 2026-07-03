const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sirenGuard', {
  lock: () => ipcRenderer.invoke('lock-screen'),
  savePosition: (position) => ipcRenderer.invoke('save-position', position),
  getPosition: () => ipcRenderer.invoke('get-position'),
});
