---
plan: 01-vite-migration
phase: 1
wave: 1
depends_on: []
files_modified:
  - package.json
  - vite.config.js
  - index.html
  - src/main.js
  - src/api/client.js
  - src/player/state.js
  - src/player/engine.js
  - src/ui/navigation.js
  - src/ui/cards.js
  - src/ui/notifications.js
  - src/ui/miniPlayer.js
  - src/ui/fullscreen.js
  - src/features/mood.js
  - src/features/favorites.js
  - src/features/playlists.js
  - src/features/history.js
  - src/features/login.js
autonomous: true
requirements_addressed: [FOUND-01, FOUND-05]
---

# Plan: Vite Migration

## Objective

Migrate the Mehfil Music Player from raw script-tag HTML/JS to a Vite-powered ES module project. Split the 10,100-line `index.js` monolith into logical ES modules. Configure a dev proxy for the jiosaavn-api backend. Eliminate script-load-order dependency and global `window.*` coupling.

## must_haves

- `npm run dev` starts the app at localhost:5173 with proxy to localhost:3000
- `npm run build` completes without error
- All existing home page features work: trending songs load, new releases load, artists load
- Play/pause works end-to-end (song loads and plays audio)
- Mini-player shows when a song is played

## Tasks

### Task 1: Initialize Vite Project

<read_first>
- `index.html` (existing entry point — preserve all HTML structure)
- `index.js` (lines 1–100 — top-level globals and ENDPOINTS to extract)
- `.planning/codebase/STRUCTURE.md` (existing file layout)
</read_first>

<action>
Run in project root (NOT inside jiosaavn-api/):
```bash
npm create vite@latest . -- --template vanilla
```
When prompted about existing files, choose to ignore / keep existing files.

After init, edit `package.json` to ensure:
- `"name": "mehfil"`
- `"version": "1.0.0"`
- `"scripts"` includes: `"dev": "vite"`, `"build": "vite build"`, `"preview": "vite preview"`
- Keep existing deps, add: `"lucide": "^0.400.0"` (in dependencies)

Create `vite.config.js`:
```js
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'Assets',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path
      }
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'index.html'
    }
  }
});
```
</action>

<acceptance_criteria>
- `package.json` exists at root with `"vite"` in devDependencies and `"lucide"` in dependencies
- `vite.config.js` exists and contains `proxy: { '/api': { target: 'http://localhost:3000'`
- `npm install` completes without error
</acceptance_criteria>

---

### Task 2: Create `src/` Module Structure

<read_first>
- `index.js` lines 1–50 (API_BASE_URL, ENDPOINTS, global vars)
- `index.js` lines 616–641 (loadUserData, saveUserData)
- `index.js` lines 152–243 (musicHistory, enrichSong)
- `index.js` lines 46–57 (login state)
</read_first>

<action>
Create the following directory structure:
```
src/
  main.js
  api/
    client.js
  player/
    state.js
    engine.js
  ui/
    navigation.js
    cards.js
    notifications.js
    miniPlayer.js
    fullscreen.js
  features/
    mood.js
    favorites.js
    playlists.js
    history.js
    login.js
```

**`src/api/client.js`** — Extract from index.js lines 3–43:
```js
export const API_BASE_URL = (() => {
  const params = new URLSearchParams(window.location.search);
  const queryOverride = params.get('apiBase');
  if (queryOverride) return queryOverride.replace(/\/$/, '');
  try {
    const storedOverride = localStorage.getItem('mehfilApiBaseUrl');
    if (storedOverride) return storedOverride.replace(/\/$/, '');
  } catch (e) {}
  if (window.location.protocol === 'file:') return 'http://localhost:3000';
  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  const isPrivate = /^(10\.|172\.(1[6-9]|2\d|3[0-1])\.|192\.168\.)/.test(host);
  if (isLocal || isPrivate) return `${window.location.protocol}//${host}:3000`;
  return '';
})();

export const ENDPOINTS = {
  trendingSongs: '/api/search/songs?query=bollywood%20trending%202024%20hits&language=hindi',
  newReleasesAlbums: '/api/search/songs?query=new%20hindi%20songs&language=hindi',
  popularArtists: '/api/search/artists?query=arijit%20singh%20shreya%20ghoshal%20rahat%20fateh&language=hindi',
  featuredPlaylists: '/api/search/playlists?query=bollywood%20hits%20romantic&language=hindi',
  searchSongs: '/api/search/songs',
  searchAlbums: '/api/search/albums',
  searchArtists: '/api/search/artists',
  searchPlaylists: '/api/search/playlists',
  albumDetails: '/api/albums?id=',
  playlistDetails: '/api/playlists?id=',
  songDetails: '/api/songs?id=',
  artistDetails: '/api/artists?id='
};

export async function apiFetch(endpoint, params = {}) {
  const url = new URL(API_BASE_URL + endpoint, window.location.href);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}
```

**`src/player/state.js`** — Extract all mutable playback globals:
```js
export const state = {
  songs: [],
  currentSongIndex: 0,
  songQueue: [],
  currentQueueIndex: 0,
  isShuffleEnabled: false,
  repeatMode: 'off', // 'off' | 'all' | 'one'
  originalQueue: [],
  allTrendingSongs: [],
  filteredTrendingSongs: [],
  allNewReleases: [],
  filteredNewReleases: [],
  currentUser: null,
  likedSongs: [],
  userPlaylists: [],
  trendingPageState: { currentPage: 0, isLoading: false, hasMorePages: true },
  latestPageState: { currentPage: 0, isLoading: false, hasMorePages: true },
  artistsPageState: { currentPage: 0, isLoading: false, hasMorePages: true, currentCategory: 'popular' },
};
```

**`src/main.js`** — Entry point that imports and initialises all modules:
```js
import './styles/main.css';
import { initLogin } from './features/login.js';
import { initNavigation } from './ui/navigation.js';
import { initMiniPlayer } from './ui/miniPlayer.js';
import { initFullscreen } from './ui/fullscreen.js';
import { initMoodFilter } from './features/mood.js';
import { loadUserData } from './features/favorites.js';
import { loadHomeData } from './ui/cards.js';

document.addEventListener('DOMContentLoaded', () => {
  loadUserData();
  initLogin();
  initNavigation();
  initMiniPlayer();
  initFullscreen();
  initMoodFilter();
  loadHomeData();
});
```

Remaining modules (`navigation.js`, `cards.js`, `notifications.js`, `miniPlayer.js`, `fullscreen.js`, `mood.js`, `favorites.js`, `playlists.js`, `history.js`, `login.js`) should each extract their corresponding functions from `index.js` and `js/player.js`. Each module exports its public API. No module should write to `window.*` — use ES module imports instead.
</action>

<acceptance_criteria>
- Directory `src/` exists with `main.js`, `api/client.js`, `player/state.js`, `player/engine.js`
- `src/api/client.js` contains `export const API_BASE_URL`
- `src/api/client.js` contains `export const ENDPOINTS`
- `src/player/state.js` contains `export const state`
- `src/main.js` contains `import './styles/main.css'`
- `src/main.js` contains `document.addEventListener('DOMContentLoaded'`
</acceptance_criteria>

---

### Task 3: Update index.html for Vite

<read_first>
- `index.html` (full file — all existing `<link>` and `<script>` tags)
</read_first>

<action>
Edit `index.html`:

1. **Remove all `<script src="...">` tags** at the bottom (the 6 script-tag loads):
   - `js/audio-fix.js?v=3.0`
   - `index.js?v=3.0`
   - `js/player.js?v=3.0`
   - `js/mini-player-enhancements.js?v=3.0`
   - `js/fullscreen-player-enhancements.js?v=3.0`
   - `js/audio-visualizer.js?v=3.0`
   - `js/scroll-progress.js?v=3.0`

2. **Remove Bootstrap Icons CDN link** (the `<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@...">` if present). If it's loaded in CSS, remove the `@import` from `styles.css`.

3. **Add Vite entry point** before `</body>`:
   ```html
   <script type="module" src="/src/main.js"></script>
   ```

4. **Keep all existing CSS `<link>` tags** — they will be progressively consolidated in Phase 2 (design system). For now keep them as-is.

5. **Keep all existing HTML structure** — all `<div>` sections, player UI, login modal unchanged.
</action>

<acceptance_criteria>
- `index.html` contains `<script type="module" src="/src/main.js"></script>`
- `index.html` does NOT contain `<script src="index.js`
- `index.html` does NOT contain `<script src="js/player.js`
- `index.html` does NOT contain Bootstrap Icons CDN link: `cdn.jsdelivr.net/npm/bootstrap-icons`
</acceptance_criteria>

---

### Task 4: Create CSS Entry and Consolidate Imports

<read_first>
- `styles.css` lines 1–30 (check for @import or Bootstrap Icons reference)
- `index.html` lines 1–26 (existing CSS link tags)
</read_first>

<action>
Create `src/styles/main.css` as the CSS entry point:
```css
/* === Mehfil Design Tokens === */
@import '../../styles/brand-identity.css';
@import '../../styles/noir-gold-theme.css';

/* === Base === */
@import '../../styles.css';

/* === Components === */
@import '../../styles/player.css';
@import '../../styles/mini-player.css';
@import '../../styles/fullscreen-player.css';
@import '../../styles/audio-visualizer.css';
@import '../../styles/premium-fullscreen.css';
@import '../../styles/unified-cards.css';
@import '../../styles/card-hover-fix.css';
@import '../../styles/micro-delights.css';
@import '../../styles/feedback.css';

/* flaticon-icons.css intentionally excluded — replaced by Lucide in Phase 2 */
```

Remove individual CSS `<link>` tags from `index.html` that are now covered by the main.css import. Keep only:
```html
<link rel="icon" type="image/x-icon" href="/favicon.ico">
```
(Vite will serve the stylesheet via the `<script type="module">` import.)
</action>

<acceptance_criteria>
- `src/styles/main.css` exists
- `src/styles/main.css` contains `@import '../../styles/brand-identity.css'`
- `src/main.js` contains `import './styles/main.css'`
- Running `npm run dev` does not produce CSS 404 errors in browser console
</acceptance_criteria>

---

### Task 5: Smoke Test Dev Server

<read_first>
- `vite.config.js` (verify proxy config)
- `src/main.js` (verify imports are correct)
- `package.json` (verify scripts)
</read_first>

<action>
Run:
```bash
npm install
npm run dev
```

Open `http://localhost:5173` in browser. Verify:
- Page loads without blank screen
- No 404 errors for JS or CSS in browser console
- Home page sections render (trending, new releases, artists)
- If jiosaavn-api is running on port 3000: songs appear in home sections
- Mini-player does not appear until a song is clicked/played

Fix any import errors or missing export references before marking complete.
</action>

<acceptance_criteria>
- `npm install` exits with code 0
- `npm run dev` starts server and prints `Local: http://localhost:5173`
- Browser console shows no "Failed to resolve module" or "Cannot find module" errors
- `index.html` loads in browser without blank screen
</acceptance_criteria>

## Verification

```bash
# Verify Vite installed
test -f node_modules/.bin/vite && echo "PASS: vite installed" || echo "FAIL"

# Verify proxy config
grep -q "localhost:3000" vite.config.js && echo "PASS: proxy configured" || echo "FAIL"

# Verify old script tags removed
grep -q '<script src="index.js' index.html && echo "FAIL: old script tag present" || echo "PASS: cleaned"

# Verify module entry
grep -q 'type="module" src="/src/main.js"' index.html && echo "PASS" || echo "FAIL"

# Verify build succeeds
npm run build 2>&1 | tail -5
```
