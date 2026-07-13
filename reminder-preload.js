const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('reminderOverlay', {
  onShow: (callback) => {
    ipcRenderer.on('reminder:show', (_event, payload) => callback(payload));
  },
  complete: () => ipcRenderer.invoke('reminder:complete'),
});
