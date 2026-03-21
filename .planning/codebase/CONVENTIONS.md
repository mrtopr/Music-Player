# CONVENTIONS.md — Mehfil Music Player

## Code Style

### JavaScript (Frontend — index.js, js/*.js)

**No linter or formatter configured for the frontend.** Style is informal and ad-hoc.

Observed patterns:
- **ES6+:** Arrow functions, template literals, destructuring, spread operator, `const`/`let`
- **No `var`** in new code
- **Function declarations** are preferred for top-level functions (`function loadSong() {}`)
- **Arrow functions** used for callbacks and event handlers
- **Promise chains:** `.then().catch()` style (not async/await in most places)
- **Async/await** used in some newer sections of `index.js`

### JavaScript (Backend — jiosaavn-api/src/)
- **TypeScript 5.8** with strict mode
- **ESLint** enforced (`.kolhe/eslint-config`)
- **Prettier** enforced (auto-format on pre-commit)
- **Conventional Commits** enforced via commitlint
- ES modules (`import`/`export`) throughout

## Naming Conventions

### Variables & Functions
```js
// camelCase for variables
let currentSongIndex = 0;
let isShuffleEnabled = false;

// camelCase for functions
function loadSong(song) {}
function showHomePage() {}
function renderTrendingSongs(songs) {}

// Event handler naming: action + noun
function togglePlay() {}
function toggleMute() {}
function toggleShuffle() {}
```

### DOM IDs
```html
<!-- camelCase IDs -->
<div id="miniPlayer">
<div id="fullscreenPlayer">
<input id="searchInput">
<button id="miniPlayButton">
```

### CSS Classes
```css
/* kebab-case classes */
.mini-player { }
.fullscreen-player { }
.song-card { }
.control-bar { }
.trending-songs { }
```

### File Names
- JS files: `kebab-case.js` (`mini-player-enhancements.js`, `audio-visualizer.js`)
- CSS files: `kebab-case.css` (`noir-gold-theme.css`, `micro-delights.css`)

## Global State Pattern

State is shared between files via `window.*` properties:
```js
// index.js exposes:
window.songs           // current song array
window.currentSongIndex
window.playSong        // play function
window.nextSong        // next/prev functions
window.prevSong
window.playNextSong
window.playPreviousSong
window.showNotification

// player.js exposes:
window.playerControls  // { togglePlay, setVolume, ... }
window.loadAndPlaySong
window.updatePlayerUI
```

**Guard pattern** used to prevent double-wrapping:
```js
if (!window.__mehfilPlaySongWrapped) {
  const originalPlaySong = window.playSong || function() {};
  window.playSong = function(song) { /* wrap */ };
  window.__mehfilPlaySongWrapped = true;
}
```

## Error Handling

### Frontend
- API errors: `try/catch` blocks around fetch calls, fallback to empty state in UI
- Audio errors: `audio.addEventListener('error', ...)` → `showNotification('Error...', 'error')`
- localStorage errors: wrapped in try/catch, silently fails

### Backend
- Zod validation returns structured error responses
- Hono's built-in error handling

## Logging

Extensive `console.log` with emoji prefixes for easy scanning:
```js
console.log('🎵 Loading song:', song.title);
console.log('🎭 Applying mood filter:', mood);
console.log('✅ Fullscreen player enhancements initialized');
console.log('📊 Results: trending:', count);
```

## Notifications / Feedback

Central `showNotification(message, type, duration)` function in `index.js`:
- Types: `'info'`, `'success'`, `'error'`, `'warning'`
- Auto-dismiss after `duration` ms
- Falls back to `console.log` if DOM not ready

## CSS Conventions

- Custom properties (CSS variables) used for theming in `brand-identity.css`
- `--primary-color`, `--gold-color`, `--bg-dark` etc.
- Mobile-first responsive via media queries
- Utility classes: `.mobile-only`, `.desktop-only` for show/hide per breakpoint
- Animation: CSS keyframes + JS classList toggling
