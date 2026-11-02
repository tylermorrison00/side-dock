const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('sideDock', {
  getState: () => ipcRenderer.invoke('get-state'),
  setMode: (mode) => ipcRenderer.invoke('set-mode', mode),
  setHidden: (hidden) => ipcRenderer.invoke('set-hidden', hidden),
  showFromArrow: () => ipcRenderer.invoke('show-from-arrow'),
  onAutoHideShow: (cb) => ipcRenderer.on('auto-hide-show', cb),
  setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
  setAutostart: (on) => ipcRenderer.invoke('set-autostart', on),
  doUpdate: () => ipcRenderer.invoke('do-update'),
  setGithubToken: (token) => ipcRenderer.invoke('set-github-token', token),
  clearGithubToken: () => ipcRenderer.invoke('clear-github-token'),
  addTool: (tool) => ipcRenderer.invoke('add-tool', tool),
  removeTool: (id) => ipcRenderer.invoke('remove-tool', id),
  launchTool: (tool) => ipcRenderer.invoke('launch-tool', tool),
  minimize: () => ipcRenderer.invoke('window-min'),
  close: () => ipcRenderer.invoke('window-close'),
  setMouseEvents: (ignore) => ipcRenderer.invoke('set-mouse-events', ignore)
});
