# CONCERNS.md — Mehfil Music Player

## 🔴 Critical

### 1. Monolithic index.js (10,100 lines)
`index.js` is a single file containing virtually all frontend logic: API calls, song rendering, page navigation, queue management, mood filtering, user data, play history, search, and UI utilities. This creates:
- Very difficult to maintain or extend any feature
- High risk of unexpected side effects when modifying any area
- No clear module boundaries — all functions are globally scoped
- Hard to test (no isolation)

**Phase mapping:** Should be split into ES modules (or at minimum, functional JS modules) in any refactor milestone.

### 2. Global State - No Isolation
All state lives as global variables in `index.js` and is shared via `window.*` properties. Scripts overwrite each other's functions using wrapper patterns (`window.__mehfilPlaySongWrapped`), which is fragile:
- If load order changes, state can be corrupted
- Multiple `generateWaveform()` functions exist (one in `index.js`, one in `player.js`) — will conflict
- `updateTimeDisplay` function duplicated in `player.js`

### 3. Duplicate Function Definitions
Several functions are defined in multiple files:
- `generateWaveform()` — in both `index.js` and `js/player.js`
- `formatTime` / `formatMobileTimeValue` — similar functions in multiple files
- `updateWaveformAnimation` / `updateWaveform` — different implementations in different files

**Risk:** Last-loaded script wins: behavior depends on script load order.

## 🟡 Significant

### 4. No Frontend Build Pipeline
No bundler, no transpiler, no minification. The app runs from raw source files:
- `index.js` is 330 KB unminified — slow first load on slow connections
- No tree-shaking — all code is always loaded even if unused
- No code splitting possible without significant refactor
- Caching controlled only by `?v=3.0` cache-bust query string (all 6 scripts share same version string)

### 5. No .gitignore at Root
The root repo has no `.gitignore`. This risks committing:
- `node_modules/` (if any are ever installed at root)
- `.venv/` (Python virtual environment — already present but probably not needed)
- OS files (`.DS_Store`, `Thumbs.db`)
- VS Code settings that shouldn't be shared

### 6. Unofficial API Dependency
The backend is an unofficial JioSaavn scraper (forked from a public repo). Risks:
- JioSaavn can change their internal API at any time, breaking the app without notice
- Audio URL decryption depends on DES key(s) that may change
- No fallback if JioSaavn blocks requests or changes encryption
- Legal/ToS concerns with distributing JioSaavn content

### 7. No Authentication / User Persistence
All user data (liked songs, playlists, play history) lives only in `localStorage`:
- Data is lost when clearing browser storage
- Cannot sync across devices or browsers
- Profile photo is stored locally (can be lost)
- No user accounts

### 8. .venv Directory in Project Root
A Python virtual environment exists at `.CODING\My Projects\Music Player\.venv` but the project has no Python code. This suggests either:
- Left-over from a different experiment
- Used for a Python-based local server script
It should be in `.gitignore` (and isn't, per concern #5).

## 🟢 Minor

### 9. `test-script.js` at Root
A 910-byte test/scratch script sits at the project root and is not excluded from the repo. Should be removed or moved to a test directory.

### 10. `setInterval` in Waveform Animation
`index.js` `updateWaveformAnimation()` creates `setInterval` callbacks per bar when entering playing state, but **never clears them** when pausing/stopping:
```js
bar.classList.add('active');
setInterval(() => {
  if (Math.random() > 0.5) bar.classList.toggle('active');
}, 800 + (index * 100));  // ← never returned, never cleared
```
This leaks intervals every time a song is played.

### 11. `audio-init-fix.js` Not Loaded in index.html
`js/audio-init-fix.js` exists in the `js/` directory but is **not referenced** in `index.html`'s script tags. The file may be dead code.

### 12. Mixed Icon Systems
The project uses two icon systems simultaneously:
- Bootstrap Icons (`bi bi-*` class-based icons from CDN)
- Custom SVG files in `Assets/flaticon/`
This creates visual inconsistency and increases HTTP requests (CDN + local SVGs).

### 13. version Query Strings
All 6 scripts use `?v=3.0` cache-bust. When updating any script, all 6 cache versions must be manually bumped — easy to forget.
