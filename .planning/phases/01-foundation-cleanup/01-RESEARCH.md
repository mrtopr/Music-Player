# Phase 1 Research — Foundation & Cleanup

## RESEARCH COMPLETE

**Phase:** 1 — Foundation & Cleanup
**Date:** 2026-03-22
**Scope:** Vite migration, Lucide Icons integration, dead code removal

---

## 1. Vite Migration Strategy

### Current State
- Raw HTML/CSS/JS — no build step, all scripts loaded via `<script>` tags in `index.html`
- 10,100-line `index.js` monolith with global scope
- Script load order matters (audio-fix.js → index.js → player.js → ...)
- No `package.json` at root

### Vite Approach: "Vanilla JS" Template
```bash
npm create vite@latest . -- --template vanilla
```
- Generates `package.json`, `vite.config.js`, `index.html` entry
- Dev server at `localhost:5173` with HMR
- Production build outputs to `dist/`

### Proxy Configuration
The jiosaavn-api backend runs on `localhost:3000`. Vite dev server must proxy `/api/*` to avoid CORS:
```js
// vite.config.js
export default {
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
}
```

### ES Module Split Strategy
Split `index.js` into logical ES modules:
```
src/
  main.js           ← entry point (replaces index.js root)
  api/
    client.js       ← API_BASE_URL, ENDPOINTS, fetch helpers
  player/
    engine.js       ← audio element, loadSong, playSong, queue
    state.js        ← global playback state (songs, index, etc.)
  ui/
    navigation.js   ← showHomePage, showTrendingPage, etc.
    cards.js        ← renderTrendingSongs, renderNewReleases, etc.
    notifications.js← showNotification
    miniPlayer.js   ← mini player UI updates
    fullscreen.js   ← fullscreen player UI
  features/
    mood.js         ← enrichSong, applyMoodFilter
    favorites.js    ← likedSongs, toggleLikeSong
    playlists.js    ← userPlaylists, createNewPlaylist
    history.js      ← musicHistory, play tracking
    login.js        ← login modal, currentUser
```

### Key Migration Rules
1. Replace `window.xxx = function()` with proper ES module exports
2. Replace `window.__mehfilWrapXyz` guards with module-level singletons
3. Each module imports what it needs — no more implicit globals
4. CSS: import directly in JS entry (`import './styles/main.css'`)

---

## 2. Lucide Icons Integration

### Installation
```bash
npm install lucide
```

### Usage Pattern — Vanilla JS
```js
import { Play, Pause, SkipForward, SkipBack, Volume2, Heart } from 'lucide';

// Create icon element
const playIcon = Play({ class: 'icon', size: 20, strokeWidth: 2 });
document.querySelector('#playBtn').appendChild(playIcon);
```

Alternative — use `createIcons()` for HTML-first approach:
```js
import { createIcons, Play, Pause } from 'lucide';
// In HTML: <i data-lucide="play"></i>
createIcons({ icons: { Play, Pause } });
```

### Icons Needed (replacing Bootstrap Icons + SVG files)
| Old | New Lucide Name |
|-----|----------------|
| `bi-play-fill` | `Play` |
| `bi-pause-fill` | `Pause` |
| `bi-skip-start-fill` | `SkipBack` |
| `bi-skip-end-fill` | `SkipForward` |
| `bi-volume-up` | `Volume2` |
| `bi-volume-down` | `Volume1` |
| `bi-volume-mute` | `VolumeX` |
| `bi-heart` | `Heart` |
| `bi-heart-fill` | `Heart` (filled via CSS) |
| `bi-shuffle` | `Shuffle` |
| `bi-arrow-repeat` | `Repeat` |
| `bi-repeat-1` | `Repeat1` |
| `bi-music-note` | `Music` |
| `bi-music-note-list` | `ListMusic` |
| `bi-search` | `Search` |
| `bi-arrows-angle-expand` | `Maximize2` |
| `bi-chevron-down` | `ChevronDown` |
| `bi-x-lg` | `X` |
| `bi-fire` | `Flame` |
| `bi-mic-fill` | `Mic2` |
| home SVG | `Home` |
| playlist SVG | `ListMusic` |
| heart SVG | `Heart` |
| settings SVG | `Settings` |
| logout SVG | `LogOut` |
| search SVG | `Search` |
| list SVG | `Menu` |
| arrow-left SVG | `ArrowLeft` |
| arrow-right SVG | `ArrowRight` |
| mic SVG | `Mic` |
| fire SVG | `Flame` |
| chevron-left/right SVG | `ChevronLeft` / `ChevronRight` |

### CSS for Filled Heart
```css
.icon-heart.liked path { fill: currentColor; }
```

---

## 3. Dead Code & Cleanup Inventory

### Files to DELETE
| File | Reason |
|------|--------|
| `test-script.js` | Manual scratch file, no tests |
| `.venv/` | Python venv with no Python code |
| `styles/flaticon-icons.css` | SVG sizing — replaced by Lucide |
| `Assets/flaticon/` | All local SVG icons — replaced by Lucide |
| `Assets/untitledui/` | Additional icon set — replaced by Lucide |

### Files to MERGE/REMOVE (after Vite module split)
| File | Disposition |
|------|------------|
| `js/audio-init-fix.js` | Integrate into `src/player/engine.js` |
| `js/scroll-progress.js` | Move to `src/ui/scroll.js` (801 bytes) |
| `js/premium-fullscreen-audio.js` | Merge into fullscreen module (Phase 6) |

### Bugs to Fix
1. **setInterval leak** in `index.js` `updateWaveformAnimation()`:
   ```js
   // BAD — interval never stored, never cleared:
   setInterval(() => { bar.classList.toggle('active'); }, 800 + (index * 100));
   
   // FIX — store and clear on pause/stop:
   const intervals = [];
   bars.forEach((bar, i) => {
     const id = setInterval(() => bar.classList.toggle('active'), 800 + (i * 100));
     intervals.push(id);
   });
   // On pause: intervals.forEach(clearInterval);
   ```

2. **Duplicate `generateWaveform()`** in `index.js` (10 bars) and `js/player.js` (20 bars):
   - Keep 20-bar version, delete from index.js

3. **`audio-init-fix.js` not loaded** — add to index.html or integrate to entry module

---

## 4. .gitignore for Root Repo
```
node_modules/
dist/
.venv/
*.env
.DS_Store
Thumbs.db
```

---

## Validation Architecture

### Verification Commands
```bash
# Verify Vite builds successfully
npm run build && echo "BUILD OK"

# Verify no Bootstrap Icons CDN references remain
grep -r "cdn.jsdelivr.net/npm/bootstrap-icons" . --include="*.html" --include="*.js" | wc -l

# Verify no bi- class references remain
grep -r "bi bi-" . --include="*.html" --include="*.js" --include="*.css" | grep -v node_modules | wc -l

# Verify no local SVG img tags remain
grep -r "Assets/flaticon" . --include="*.html" --include="*.js" | grep -v node_modules | wc -l

# Verify test-script.js deleted
test -f test-script.js && echo "FAIL: still exists" || echo "PASS: deleted"

# Verify .venv deleted
test -d .venv && echo "FAIL: still exists" || echo "PASS: deleted"

# Verify setInterval fix (intervals array pattern)
grep -n "intervals" src/ui/fullscreen.js
```
