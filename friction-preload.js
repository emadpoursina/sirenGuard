const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('frictionGate', {
  onInit: (callback) => {
    ipcRenderer.on('friction:init', (_event, payload) => callback(payload));
  },
  confirm: (phrase) => ipcRenderer.invoke('friction:confirm', { phrase }),
  cancel: () => ipcRenderer.invoke('friction:cancel'),
});
