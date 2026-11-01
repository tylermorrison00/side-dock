const { app, BrowserWindow, ipcMain, shell, screen } = require('electron');
const { exec } = require('child_process');
const fs = require('fs');
const https = require('https');
const os = require('os');
const path = require('path');

// One-click update: sidebar ke Update button se. Kaam is tarah:
// 1) repo ki package.json se naya version check karo
// 2) naya ho to repo ka main zip download karo, extract karo, app folder me copy karo
// 3) npm install dobara chalao (agar nayi library aayi ho to wo bhi aa jaye)
// 4) app restart karo. Zip download ya install dobara user ko nahi karna.
// NOTE: ye download sirf tab kaam karega jab repo public ho, kyunki private
// repo ki files bina login ke download nahi hoti. Private repo par button
// seedha error dikhayega, app kharab nahi hogi.
const UPDATE_RAW = 'https://raw.githubusercontent.com/tylermorrison00/side-dock/main/package.json';
const UPDATE_ZIP = 'https://github.com/tylermorrison00/side-dock/archive/refs/heads/main.zip';

function fetchText(url, hops = 0) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'SideDock-Updater' } }, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && hops < 5) {
        res.resume();
        fetchText(res.headers.location, hops + 1).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) { res.resume(); reject(new Error('HTTP ' + res.statusCode)); return; }
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}
function runCmd(cmd, cwd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd, windowsHide: true, timeout: 600000 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message)); else resolve(stdout);
    });
  });
}

let win = null;
let mode = 'expanded'; // 'collapsed' = icons only, 'expanded' = icons + names
let autoStart = true; // laptop on hote hi Side Dock khud khul jaye
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
    if (typeof data.autoStart === 'boolean') autoStart = data.autoStart;
  } catch {}
}

function saveSettings() {
  try { fs.writeFileSync(settingsPath, JSON.stringify({ mode, autoStart }, null, 2)); } catch {}
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
  // Windows login par auto-start: laptop on hote hi app khud chalega.
  try { app.setLoginItemSettings({ openAtLogin: autoStart }); } catch {}
  win = new BrowserWindow({
    width,
    height: area.height,
    icon: path.join(__dirname, 'assets', 'icon.png'),
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

ipcMain.handle('get-state', () => ({ mode, autoStart, tools: loadTools() }));
ipcMain.handle('set-autostart', (_e, next) => {
  autoStart = !!next;
  saveSettings();
  try { app.setLoginItemSettings({ openAtLogin: autoStart }); } catch {}
  return autoStart;
});
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
ipcMain.handle('do-update', async () => {
  if (process.platform !== 'win32') return { ok: false, message: 'Update sirf Windows version par hai.' };
  try {
    let localVersion = '';
    try { localVersion = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8')).version || ''; } catch {}
    const remote = JSON.parse(await fetchText(UPDATE_RAW));
    if (remote.version && remote.version === localVersion) {
      return { ok: true, updated: false, version: localVersion, message: 'App pehle se latest hai.' };
    }
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sidedock-update-'));
    const zipPath = path.join(tmpDir, 'update.zip');
    const extractDir = path.join(tmpDir, 'extracted');
    await new Promise((resolve, reject) => {
      const file = fs.createWriteStream(zipPath);
      https.get(UPDATE_ZIP, { headers: { 'User-Agent': 'SideDock-Updater' } }, (res) => {
        if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
          https.get(res.headers.location, (r2) => { r2.pipe(file); file.on('finish', () => { file.close(); resolve(); }); }).on('error', reject);
          return;
        }
        if (res.statusCode !== 200) { reject(new Error('HTTP ' + res.statusCode)); return; }
        res.pipe(file); file.on('finish', () => { file.close(); resolve(); });
      }).on('error', reject);
    });
    await runCmd(`powershell -NoProfile -Command "Expand-Archive -Force -Path '${zipPath}' -DestinationPath '${extractDir}'"`, tmpDir);
    const srcDir = path.join(extractDir, 'side-dock-main');
    if (!fs.existsSync(path.join(srcDir, 'package.json'))) throw new Error('Update zip me app files nahi mili.');
    // node_modules, .git aur dist ko chhero mat — baqi sab nayi files se replace karo.
    for (const entry of fs.readdirSync(srcDir)) {
      if (['node_modules', '.git', 'dist'].includes(entry)) continue;
      fs.cpSync(path.join(srcDir, entry), path.join(__dirname, entry), { recursive: true, force: true });
    }
    try { await runCmd('npm install --no-audit --no-fund', __dirname); } catch (e) { console.error('npm install after update:', e.message); }
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    const newVersion = remote.version || '';
    setTimeout(() => { app.relaunch(); app.quit(); }, 500);
    return { ok: true, updated: true, version: newVersion, message: 'Update ho gaya, app restart ho rahi hai.' };
  } catch (e) {
    const msg = String(e.message || e);
    if (msg.includes('404') || msg.includes('403')) {
      return { ok: false, message: 'Update download nahi ho saka — repo abhi private hai. Repo public hone par ye button kaam karega.' };
    }
    return { ok: false, message: 'Update nahi ho saka: ' + msg };
  }
});
