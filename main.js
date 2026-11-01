const { app, BrowserWindow, ipcMain, shell, screen } = require('electron');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

let win = null;
let mode = 'expanded'; // 'collapsed' = icons only, 'expanded' = icons + names
let settingsPath = '';
let toolsPath = '';

function windowSize() {
  return mode === 'collapsed' ? { width: 76, height: 0 } : { width: 280, height: 0 };
}

function loadSettings() {
  try {
    const raw = fs.readFileSync(settingsPath, 'utf8');
    const data = JSON.parse(raw);
    if (data.mode === 'collapsed' || data.mode === 'expanded') mode = data.mode;
  } catch {}
}

function saveSettings() {
  try { fs.writeFileSync(settingsPath, JSON.stringify({ mode }, null, 2)); } catch {}
}

function loadTools() {
  try { return JSON.parse(fs.readFileSync(toolsPath, 'utf8')); } catch {}
  try {
    const defaults = JSON.parse(fs.readFileSync(path.join(__dirname, 'tools.json'), 'utf8'));
    fs.writeFileSync(toolsPath, JSON.stringify(defaults, null, 2));
    return defaults;
  } catch { return []; }
}

function saveTools(tools) {
  fs.writeFileSync(toolsPath, JSON.stringify(tools, null, 2));
}

function dockWindow() {
  if (!win) return;
  const area = screen.getPrimaryDisplay().workArea;
  const { width } = windowSize();
  win.setSize(width, area.height);
  win.setPosition(area.x + area.width - width, area.y);
}

function createWindow() {
  settingsPath = path.join(app.getPath('userData'), 'settings.json');
  toolsPath = path.join(app.getPath('userData'), 'tools.json');
  loadSettings();
  const area = screen.getPrimaryDisplay().workArea;
  const { width } = windowSize();
  win = new BrowserWindow({
    width,
    height: area.height,
    x: area.x + area.width - width,
    y: area.y,
    frame: false,
    resizable: false,
    minimizable: true,
    maximizable: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.on('closed', () => { win = null; });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (!win) createWindow(); });

ipcMain.handle('get-state', () => ({ mode, tools: loadTools() }));
ipcMain.handle('set-mode', (_e, next) => {
  mode = next === 'collapsed' ? 'collapsed' : 'expanded';
  saveSettings();
  dockWindow();
  return mode;
});
ipcMain.handle('add-tool', (_e, tool) => {
  const tools = loadTools();
  tools.push({ id: Date.now().toString(), name: String(tool.name || 'Tool').slice(0, 40), icon: String(tool.icon || '◆').slice(0, 4), target: String(tool.target || ''), kind: tool.kind === 'app' ? 'app' : 'url' });
  saveTools(tools);
  return tools;
});
ipcMain.handle('remove-tool', (_e, id) => {
  const tools = loadTools().filter(t => t.id !== id);
  saveTools(tools);
  return tools;
});
ipcMain.handle('launch-tool', (_e, tool) => {
  if (!tool || !tool.target) return;
  if (tool.kind === 'url') { shell.openExternal(tool.target); return; }
  // App: a file path opens directly, anything else runs as a local command.
  if (fs.existsSync(tool.target)) { shell.openPath(tool.target); return; }
  exec(tool.target, (err) => { if (err) console.error(err.message); });
});
ipcMain.handle('window-min', () => win && win.minimize());
ipcMain.handle('window-close', () => win && win.close());
