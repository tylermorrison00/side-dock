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

## Files

- `main.js` — window docking, always-on-top, mode + tools storage
- `preload.js` — safe bridge between window and renderer
- `renderer/index.html` — dark navy sidebar UI, both modes
- `tools.json` — default (empty) tool list
