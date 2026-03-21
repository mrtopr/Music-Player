# ARCHITECTURE.md — Mehfil Music Player

## Pattern

**Single-Page Application (SPA)** — vanilla, no framework.

One HTML file (`index.html`) contains all UI sections. Page navigation is done by showing/hiding `<div>` elements (sections get `display: none` / `display: block`). There is no router — navigation is pure DOM manipulation via inline `onclick` handlers and JavaScript functions like `showHomePage()`, `showTrendingPage()`, `showPlaylistsPage()`.

## Layers

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Frontend)                    │
│                                                         │
│  index.html (static structure + all page sections)      │
│       │                                                 │
│       ├── styles.css + styles/*.css (13 CSS files)     │
│       │                                                 │
│       └── JS (script-tag order matters, all global):   │
│           ├── js/audio-fix.js          (DOM patch)     │
│           ├── index.js                 (core app — 10K lines) │
│           ├── js/player.js             (audio controls) │
│           ├── js/mini-player-enhancements.js            │
│           ├── js/fullscreen-player-enhancements.js      │
│           ├── js/audio-visualizer.js                    │
│           └── js/scroll-progress.js                     │
└─────────────────┬───────────────────────────────────────┘
                  │ HTTP/CORS (fetch)
                  │ API_BASE_URL resolved at runtime
                  ▼
┌─────────────────────────────────────────────────────────┐
│             jiosaavn-api/ (Backend)                     │
│                                                         │
│  Hono (TypeScript) — REST API                          │
│  src/server.ts → routes → modules → JioSaavn scraper   │
│                                                         │
│  Deployable to:                                         │
│    - Cloudflare Workers (wrangler)                      │
│    - Node.js (bun/node)                                 │
│    - Vercel (vercel.json)                               │
└─────────────────┬───────────────────────────────────────┘
                  │ HTTPS scraping (unofficial)
                  ▼
        JioSaavn.com internal APIs
        (DES-encrypted audio URLs, decrypted by backend)
```

## Core Components

### 1. App Shell (index.js)
The monolithic core — ~10,100 lines, handles:
- **Page navigation** (`showHomePage`, `showTrendingPage`, `showLatestPage`, `showArtistsPage`, `showPlaylistsPage`)
- **Data fetching** — all API calls to jiosaavn-api backend
- **Rendering** — `renderTrendingSongs`, `renderNewReleases`, `renderArtists` etc.
- **Song queue** — `songQueue[]`, `currentQueueIndex`, `addToQueue`, `removeFromQueue`, `playNextInQueue`, `playPreviousInQueue`
- **Playback** — `loadSong`, `playSong`, `playNextSong`, `playPreviousSong` (exposed on `window`)
- **Shuffle/Repeat** — `isShuffleEnabled`, `repeatMode` state + toggle functions
- **Mood filtering** — `enrichSong`, `applyMoodFilter`, `renderFilteredSongs`
- **User data** — `likedSongs[]`, `userPlaylists[]`, `loadUserData`, `saveUserData` (localStorage)
- **Play history** — `musicHistory` object with play counts, suggestions
- **Login system** — modal + localStorage user profile
- **Notifications** — `showNotification` toast system
- **Window bridge** — `window.songs`, `window.currentSongIndex` defined as properties to share state safely with other scripts

### 2. Player Controls (js/player.js — 755 lines)
- Handles mini-player and fullscreen player UI binding
- Listens to `<audio>` element events (timeupdate, ended, play, pause, error)
- Exposes `window.playerControls` object
- Exposes `window.loadAndPlaySong`, `window.updatePlayerUI`
- Wraps `window.playSong` and `window.updatePlayButtons` to add mobile overrides (guard pattern: `window.__mehfilPlaySongWrapped`)

### 3. Mini Player Enhancements (js/mini-player-enhancements.js)
- Extends the bottom mini-player bar behavior
- Gesture support, animation enhancements

### 4. Fullscreen Player Enhancements (js/fullscreen-player-enhancements.js — 40 KB)
- Desktop and mobile fullscreen player controls
- Circular progress ring, waveform, ambient particles
- Volume gesture handling on mobile

### 5. Audio Visualizer (js/audio-visualizer.js)
- WebAudio API-based bar visualizer (desktop only)
- Analyser node connected to `<audio>` element

### 6. JioSaavn Backend (jiosaavn-api/src/)
- Hono routes → service modules
- Each resource (song, album, artist, playlist, search) is its own module
- Validation via Zod schemas
- OpenAPI spec auto-generated

## Data Flow

```
User clicks song card
  → index.js: loadSong(song)
  → fetch(API_BASE_URL + '/api/songs?id=...')
  → jiosaavn-api returns song with encrypted URL
  → backend decrypts URL (node-forge DES)
  → audio.src = decrypted CDN URL
  → audio.play()
  → player.js: timeupdate → updateProgress()
  → fullscreen-player-enhancements.js: visual updates
  → audio-visualizer.js: analyser bars animate
```

## Entry Points

| Entry Point | Purpose |
|-------------|---------|
| `index.html` | App shell — open in browser or serve statically |
| `jiosaavn-api/src/server.ts` | API backend — `bun run dev` or `bun run start` |
| `jiosaavn-api/dist/server.js` | Compiled API backend |

## State Management

No state management library. State is global variables in `index.js`:
- `songs[]` — current playable song array (shared to `window.songs`)
- `currentSongIndex` — index into `songs[]`
- `songQueue[]` + `currentQueueIndex` — playback queue
- `likedSongs[]` — favorites (persisted to localStorage)
- `userPlaylists[]` — user-created playlists (persisted to localStorage)
- `musicHistory{}` — play history + suggestions
- `isShuffleEnabled`, `repeatMode` — playback mode flags
