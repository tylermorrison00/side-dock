const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('sideDock', {
  getState: () => ipcRenderer.invoke('get-state'),
  setMode: (mode) => ipcRenderer.invoke('set-mode', mode),
  setPanel: (open) => ipcRenderer.invoke('set-panel', open),
  setHidden: (hidden) => ipcRenderer.invoke('set-hidden', hidden),
  setAutohide: (on) => ipcRenderer.invoke('set-autohide', on),
  showFromArrow: () => ipcRenderer.invoke('show-from-arrow'),
  onAutoHideShow: (cb) => ipcRenderer.on('auto-hide-show', cb),
  onAutoHideHide: (cb) => ipcRenderer.on('auto-hide-hide', cb),
  onAutoHideArrowOnly: (cb) => ipcRenderer.on('auto-hide-arrow-only', cb),
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
