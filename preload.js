const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('sideDock', {
  getState: () => ipcRenderer.invoke('get-state'),
  setMode: (mode) => ipcRenderer.invoke('set-mode', mode),
  addTool: (tool) => ipcRenderer.invoke('add-tool', tool),
  removeTool: (id) => ipcRenderer.invoke('remove-tool', id),
  launchTool: (tool) => ipcRenderer.invoke('launch-tool', tool),
  minimize: () => ipcRenderer.invoke('window-min'),
  close: () => ipcRenderer.invoke('window-close')
});
