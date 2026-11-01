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

## One-click update (v1.2)

Sidebar me **Update** button dabao, bas. App khud naya version check karegi,
agar naya ho to nayi files download karke replace karegi, `npm install`
khud chalegi, phir app restart ho jayegi. Zip download ya install dobara
user ko nahi karna.

Zaroori shart: ye download sirf tab kaam karega jab repo public ho, kyunki
private repo ki files bina login ke download nahi hoti. Private repo par
Update button seedha ye error dikhayega, app kharab nahi hogi.

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
