# Side Dock

Premium edge sidebar for Windows, in the style of Side Whisper.
Dark navy sidebar, docked to the right edge of the screen, always on top.

## Two modes (exactly as designed)

1. **Icons only (collapsed)** — a slim 76px rail, tool names appear as a tooltip on hover.
2. **Icons + names (expanded)** — a 280px panel, icon ke sath tool ka naam bhi dikhta hai.

Toggle with the **Collapse Sidebar / Expand Sidebar** button at the bottom.
The mode is remembered for the next launch.

## Tools

The first version ships with an empty structure on purpose — tools will be added
later as told. In the app, **+ Add tool** adds a website link or a laptop
app/command. Tools are stored locally, no account and no cost.

## Run on Windows (free, no investment)

```bat
npm install
npm start
```

For a portable Windows build (optional):

```bat
npm run pack
```

The portable file appears in `dist/`. Node.js is the only requirement, and it
is free.

## Update (repo ab public hai — token ki zaroorat nahi)

Sidebar me **Update** button dabao, bas. Repo public hone ki wajah se app bina token ke naya version download kar legi. Token wala tareeqa ab zaroori nahi hai, is liye token laptop me save mat karo.

## Private repo update with GitHub token (v1.3, purana tareeqa — ab zaroori nahi)

Sidebar me **GitHub token** dabao, token paste karke Save karo, phir
**Update** dabao. Token ek dafa hi dalna hai.

Token banane ka tareeqa (GitHub, free): GitHub kholo > apni photo par click >
Settings > Developer settings (neeche) > Personal access tokens >
Fine-grained tokens > Generate new token. Token ka naam Side Dock rakho,
sirf side-dock repo select karo, Contents me Read-only do, Generate karo.
Jo token dikhe use foran copy kar lo, wo dobara nahi dikhega.

Token sirf tumhare laptop par Windows ke encryption se save hota hai, repo
me nahi jata, kisi aur ko nahi bheja jata. Token sirf read-only ho to leak
hone par bhi sirf ye repo parha ja sakta hai, change nahi. Kabhi bhi GitHub
se token revoke kar sakte ho, aur app me Token hatao se bhi hata sakte ho.

## One-click update (v1.2)

Sidebar me **Update** button dabao, bas. App khud naya version check karegi,
agar naya ho to nayi files download karke replace karegi, `npm install`
khud chalegi, phir app restart ho jayegi. Zip download ya install dobara
user ko nahi karna.

Zaroori shart (v1.2 wali): bina token ke ye download sirf tab kaam karega
jab repo public ho, kyunki private repo ki files bina login ke download
nahi hoti. V1.3 se token wala tareeqa hai, is liye repo private rehte hue
bhi Update kaam karega.

## Logo + auto-start (v1.1)

- Logo: `assets/icon.png` (cyan bolt on dark navy) and `build/icon.ico` for
  Windows. The packaged exe and its desktop shortcut use this logo, not the
  default Electron icon.
- Auto-start: ON by default. Laptop on / Windows login par Side Dock khud
  khul kar right edge par aa jata hai. App ke andar **Auto-start** button se
  On/Off kar sakte ho.
- Manual tareeqa (agar kabhi zaroorat pare): Windows me `Win + R`, likho
  `shell:startup`, Enter, aur us folder me Side Dock exe ka shortcut paste
  kar do. Desktop shortcut: exe par right-click > Send to > Desktop.

## Files

- `main.js` — window docking, always-on-top, mode + tools storage
- `preload.js` — safe bridge between window and renderer
- `renderer/index.html` — dark navy sidebar UI, both modes
- `tools.json` — default (empty) tool list
