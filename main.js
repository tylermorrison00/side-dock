const { app, BrowserWindow, ipcMain, shell, screen, safeStorage } = require('electron');
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
// Private repo update ka tareeqa: GitHub token (login ka hi ek tareeqa).
// Token sirf user ke laptop par, Windows ke apne encryption (DPAPI) se save
// hota hai — repo me NAHI jata, Muse ko NAHI bheja jata, sirf GitHub API ko
// update download karte waqt bheja jata hai. Token read-only rakho, sirf
// side-dock repo ke liye, taake leak hone par bhi sirf ye repo parha ja sake.
// Token na ho aur repo private ho to Update button seedha yehi batayega.
const UPDATE_RAW = 'https://raw.githubusercontent.com/tylermorrison00/side-dock/main/package.json';
const UPDATE_ZIP_API = 'https://api.github.com/repos/tylermorrison00/side-dock/zipball/main';
let tokenPath = '';

function isGithubHost(hostname) {
  return hostname === 'github.com' || hostname === 'api.github.com' ||
    hostname.endsWith('.github.com') || hostname.endsWith('.githubusercontent.com');
}
function authHeaders(url, token) {
  const headers = { 'User-Agent': 'SideDock-Updater', 'Accept': 'application/vnd.github+json' };
  try { if (token && isGithubHost(new URL(url).hostname)) headers.Authorization = 'Bearer ' + token; } catch {}
  return headers;
}
function loadToken() {
  try {
    const raw = fs.readFileSync(tokenPath, 'utf8').trim();
    if (!raw) return '';
    if (safeStorage.isEncryptionAvailable()) return safeStorage.decryptString(Buffer.from(raw, 'base64'));
    return raw;
  } catch { return ''; }
}
function saveToken(token) {
  const value = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(token).toString('base64') : token;
  fs.writeFileSync(tokenPath, value, { mode: 0o600 });
}
function fetchText(url, token, hops = 0) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: authHeaders(url, token) }, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && hops < 5) {
        res.resume();
        fetchText(res.headers.location, token, hops + 1).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) { res.resume(); reject(new Error('HTTP ' + res.statusCode)); return; }
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}
function downloadFile(url, dest, token, hops = 0) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: authHeaders(url, token) }, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && hops < 5) {
        res.resume();
        downloadFile(res.headers.location, dest, token, hops + 1).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) { res.resume(); reject(new Error('HTTP ' + res.statusCode)); return; }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
      file.on('error', reject);
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
let theme = 'dark'; // 'dark' = dark navy, 'light' = light beige
let hidden = false; // auto-hide: true = sirf arrow dikhta hai, sidebar side se bahar hai
let autoHide = true; // default ON: kaam karte waqt sidebar chhup jayegi, sirf arrow dikhega
let slideTimer = null;
let settingsPath = '';
let toolsPath = '';

function windowSize() {
  return mode === 'collapsed' ? { width: 76, height: 0 } : { width: 220, height: 0 };
}

function loadSettings() {
  try {
    const raw = fs.readFileSync(settingsPath, 'utf8');
    const data = JSON.parse(raw);
    if (data.mode === 'collapsed' || data.mode === 'expanded') mode = data.mode;
    if (typeof data.autoStart === 'boolean') autoStart = data.autoStart;
    if (data.theme === 'light' || data.theme === 'dark') theme = data.theme;
    if (typeof data.autoHide === 'boolean') autoHide = data.autoHide;
  } catch {}
}

function saveSettings() {
  try { fs.writeFileSync(settingsPath, JSON.stringify({ mode, autoStart, theme, autoHide }, null, 2)); } catch {}
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

function startupShortcutPath() {
  return path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'Side Dock.lnk');
}
async function applyAutostart() {
  // Unpackaged app ka setLoginItemSettings sirf electron.exe kholta hai,
  // is liye wo default Electron window dikhata hai, sidebar nahi.
  // Is liye auto-start Startup folder ki shortcut se hota hai jo
  // launch.vbs chalati hai, aur wo npm start chhup kar chalata hai.
  if (process.platform !== 'win32') return;
  try { app.setLoginItemSettings({ openAtLogin: false }); } catch {}
  const lnk = startupShortcutPath();
  const vbs = path.join(__dirname, 'launch.vbs');
  if (!autoStart) { try { fs.unlinkSync(lnk); } catch {} return; }
  if (!fs.existsSync(vbs)) return;
  try {
    const ps1 = path.join(os.tmpdir(), 'sidedock-startup.ps1');
    const ps = `$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('${lnk.replace(/'/g, "''")}'); $Shortcut.TargetPath = '${vbs.replace(/'/g, "''")}'; $Shortcut.WorkingDirectory = '${__dirname.replace(/'/g, "''")}'; $Shortcut.IconLocation = '${path.join(__dirname, 'build', 'icon.ico').replace(/'/g, "''")}'; $Shortcut.Save()`;
    fs.writeFileSync(ps1, ps);
    await runCmd(`powershell -NoProfile -ExecutionPolicy Bypass -File "${ps1}"`, __dirname);
  } catch {}
}

function cardSize() {
  // Window ka size hamesha expanded jitna rehta hai, taake collapse par
  // window resize ya relaunch se jhatka na lage. Sirf andar wali card
  // chhoti hoti hai, aur khali hissa click-through hota hai.
  const area = screen.getPrimaryDisplay().workArea;
  const width = 220;
  return { width, height: Math.max(400, area.height - 8), x: area.x + area.width - width - 4, y: area.y + 4 };
}
function dockWindow() {
  if (!win) return;
  const s = cardSize();
  win.setSize(s.width, s.height);
  win.setPosition(s.x, s.y);
}
function slideToHidden(next) {
  if (!win) return;
  hidden = !!next;
  const area = screen.getPrimaryDisplay().workArea;
  const s = cardSize();
  const targetX = hidden ? (area.x + area.width - 20) : s.x;
  if (slideTimer) { clearInterval(slideTimer); slideTimer = null; }
  // FIX for half-open: NO interval animation. Interval slide was getting cut off
  // by mouse events / arrow hide / hide-timer, leaving the window half out.
  // Instant full move, then one forced re-assert after 250ms, so it cannot stay half.
  try { win.setPosition(targetX, s.y); } catch {}
  try { win.setIgnoreMouseEvents(hidden, { forward: true }); } catch {}
  try { if (arrowWin) { if (hidden) { arrowWin.showInactive(); arrowWin.moveTop(); } else arrowWin.hide(); } } catch {}
  slideTimer = setTimeout(() => {
    try { win.setPosition(targetX, s.y); } catch {}
    try { win.setIgnoreMouseEvents(hidden, { forward: true }); } catch {}
    try { if (arrowWin) { if (hidden) { arrowWin.showInactive(); arrowWin.moveTop(); } else arrowWin.hide(); } } catch {}
    slideTimer = null;
  }, 250);
}

let arrowWin = null;
function createArrowWindow() {
  if (arrowWin) return;
  const area = screen.getPrimaryDisplay().workArea;
  const w = 20, h = 64;
  arrowWin = new BrowserWindow({
    width: w, height: h,
    x: area.x + area.width - w, y: area.y + Math.round((area.height - h) / 2),
    frame: false, transparent: true, backgroundColor: '#00000000',
    resizable: false, minimizable: false, maximizable: false,
    alwaysOnTop: true, skipTaskbar: true, focusable: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  arrowWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(
    '<!DOCTYPE html><html><head><style>html,body{margin:0;height:100%;background:transparent;overflow:hidden}button{width:20px;height:64px;border:1px solid #3a2a22;border-right:0;border-radius:12px 0 0 12px;background:#1a1210;color:#ff7a1a;font-size:16px;font-weight:800;cursor:pointer}</style></head><body><button id="a">◀</button><script>const open=()=>window.sideDock.showFromArrow();document.getElementById("a").addEventListener("mouseenter",open);document.getElementById("a").addEventListener("click",open);document.getElementById("a").addEventListener("dblclick",open);document.body.addEventListener("mouseenter",open);</script></body></html>'
  ));
  arrowWin.on('closed', () => { arrowWin = null; });
  arrowWin.hide();
}
function createWindow() {
  settingsPath = path.join(app.getPath('userData'), 'settings.json');
  toolsPath = path.join(app.getPath('userData'), 'tools.json');
  tokenPath = path.join(app.getPath('userData'), 'github-token.enc');
  loadSettings();
  const s = cardSize();
  // Windows login par auto-start: Startup shortcut se, electron.exe seedha nahi.
  applyAutostart();
  win = new BrowserWindow({
    width: s.width,
    height: s.height,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    x: s.x,
    y: s.y,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    minimizable: true,
    maximizable: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.on('closed', () => {
    win = null;
    // Main window band ho to arrow window bhi band karo, warna app background me
    // zinda rehta hai, dobara kholne par single-instance lock ki wajah se kuch nahi khulta.
    try { if (arrowWin && !arrowWin.isDestroyed()) arrowWin.close(); } catch {}
    arrowWin = null;
  });
  createArrowWindow();
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) { try { win.show(); win.focus(); } catch {} }
    else { try { createWindow(); } catch {} }
  });
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (!win) createWindow(); });

ipcMain.handle('get-state', () => ({ mode, autoStart, theme, autoHide, hidden, hasToken: !!loadToken(), tools: loadTools() }));
ipcMain.handle('set-hidden', (_e, next) => {
  if (!autoHide) { hidden = false; return hidden; }
  slideToHidden(next);
  return hidden;
});
ipcMain.handle('set-autohide', (_e, next) => {
  autoHide = !!next;
  saveSettings();
  if (!autoHide) slideToHidden(false);
  return autoHide;
});
ipcMain.handle('show-from-arrow', () => {
  slideToHidden(false);
  try { if (win) win.webContents.send('auto-hide-show'); } catch {}
  return hidden;
});
ipcMain.handle('set-theme', (_e, next) => {
  theme = next === 'light' ? 'light' : 'dark';
  saveSettings();
  return theme;
});
ipcMain.handle('set-github-token', (_e, token) => {
  const value = String(token || '').trim();
  if (!value) return false;
  saveToken(value);
  return true;
});
ipcMain.handle('clear-github-token', () => {
  try { fs.unlinkSync(tokenPath); } catch {}
  return true;
});
ipcMain.handle('set-autostart', async (_e, next) => {
  autoStart = !!next;
  saveSettings();
  await applyAutostart();
  return autoStart;
});
ipcMain.handle('set-mode', (_e, next) => {
  mode = next === 'collapsed' ? 'collapsed' : 'expanded';
  saveSettings();
  return mode;
});
ipcMain.handle('set-mouse-events', (_e, ignore) => {
  try { if (win) win.setIgnoreMouseEvents(!!ignore, { forward: true }); } catch {}
  return true;
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
  if (process.platform !== 'win32') return { ok: false, message: 'Update is only available on the Windows version.' };
  try {
    let localVersion = '';
    try { localVersion = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8')).version || ''; } catch {}
    const token = loadToken();
    // Raw file 5 minute tak purana version dikhata hai, is liye version
    // check GitHub API se karo, wo foran naya version deta hai.
    let remote;
    try {
      const api = JSON.parse(await fetchText('https://api.github.com/repos/tylermorrison00/side-dock/contents/package.json', token));
      remote = JSON.parse(Buffer.from(String(api.content || '').replace(/\n/g, ''), 'base64').toString('utf8'));
    } catch {
      remote = JSON.parse(await fetchText(UPDATE_RAW + '?t=' + Date.now(), token));
    }
    if (remote.version && remote.version === localVersion) {
      return { ok: true, updated: false, version: localVersion, message: 'App is already up to date.' };
    }
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sidedock-update-'));
    const zipPath = path.join(tmpDir, 'update.zip');
    const extractDir = path.join(tmpDir, 'extracted');
    await downloadFile(UPDATE_ZIP_API, zipPath, token);
    await runCmd(`powershell -NoProfile -Command "Expand-Archive -Force -Path '${zipPath}' -DestinationPath '${extractDir}'"`, tmpDir);
    // Zipball ka folder naam owner-repo-sha hota hai, side-dock-main nahi.
    // Is liye pehla folder dhoondo jis me package.json ho.
    let srcDir = '';
    for (const entry of fs.readdirSync(extractDir)) {
      const cand = path.join(extractDir, entry);
      try { if (fs.statSync(cand).isDirectory() && fs.existsSync(path.join(cand, 'package.json'))) { srcDir = cand; break; } } catch {}
    }
    if (!srcDir) throw new Error('Update zip me app files nahi mili.');
    // node_modules, .git aur dist ko chhero mat — baqi sab nayi files se replace karo.
    for (const entry of fs.readdirSync(srcDir)) {
      if (['node_modules', '.git', 'dist'].includes(entry)) continue;
      fs.cpSync(path.join(srcDir, entry), path.join(__dirname, entry), { recursive: true, force: true });
    }
    try { await runCmd('npm install --no-audit --no-fund', __dirname); } catch (e) { console.error('npm install after update:', e.message); }
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    const newVersion = remote.version || '';
    setTimeout(() => { app.relaunch(); app.quit(); }, 500);
    return { ok: true, updated: true, version: newVersion, message: 'Update done, app is restarting.' };
  } catch (e) {
    const msg = String(e.message || e);
    if (msg.includes('401') || msg.includes('403') || msg.includes('404')) {
      return { ok: false, message: 'Cannot reach the repo, please try Update again later.' };
    }
    return { ok: false, message: 'Update failed: ' + msg };
  }
});
