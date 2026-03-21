# STRUCTURE.md — Mehfil Music Player

## Root Directory Layout

```
d:\CODING\My Projects\Music Player\
├── index.html              # App shell (776 lines) — all page sections here
├── index.js                # Core app logic (10,100 lines — monolith)
├── styles.css              # Main stylesheet (138 KB)
├── styles.css              # Main stylesheet (138 KB)
├── test-script.js          # Quick test/scratch file (910 bytes)
│
├── js/                     # Modular JavaScript (8 files)
│   ├── audio-fix.js            # Early DOM/audio initialization patch
│   ├── audio-init-fix.js       # Additional audio init fixes
│   ├── audio-visualizer.js     # WebAudio API visualizer (13 KB)
│   ├── fullscreen-player-enhancements.js  # Fullscreen UI (40 KB)
│   ├── mini-player-enhancements.js        # Mini-player enhancements (17 KB)
│   ├── player.js               # Core player controls (25 KB)
│   ├── premium-fullscreen-audio.js        # Premium fullscreen audio (5 KB)
│   └── scroll-progress.js      # Scroll progress indicator (801 bytes)
│
├── styles/                 # Modular CSS (12 files)
│   ├── audio-visualizer.css    # Visualizer bar animations
│   ├── brand-identity.css      # Brand tokens: colors, fonts
│   ├── card-hover-fix.css      # Card hover state bug fixes
│   ├── feedback.css            # Toast/notification styles
│   ├── flaticon-icons.css      # SVG icon sizing
│   ├── fullscreen-player.css   # Fullscreen overlay styles
│   ├── micro-delights.css      # Micro-animation utilities
│   ├── mini-player.css         # Bottom bar mini-player (23 KB)
│   ├── noir-gold-theme.css     # Noir + gold theme overrides
│   ├── player.css              # Base player control styles
│   ├── premium-fullscreen.css  # Premium fullscreen enhancements
│   └── unified-cards.css       # Song/album card grid layout
│
├── Assets/                 # Static assets
│   ├── favicon.ico
│   ├── dp.png              # Default profile picture
│   ├── music.png           # Default album art / logo (referenced but not listed)
│   └── flaticon/           # SVG icon set
│       ├── home.svg
│       ├── playlist.svg
│       ├── heart.svg
│       ├── settings.svg
│       ├── logout.svg
│       ├── search.svg
│       ├── fire.svg
│       ├── mic.svg
│       ├── list.svg
│       ├── arrow-left.svg
│       ├── arrow-right.svg
│       ├── chevron-left.svg
│       └── chevron-right.svg
│   └── untitledui/         # Additional icon set (sub-dir)
│
├── jiosaavn-api/           # Backend API (separate git repo — upstream fork)
│   ├── src/
│   │   ├── server.ts       # Hono app entry point
│   │   ├── modules/        # Feature modules (song, album, artist, playlist, search)
│   │   └── common/         # Shared utilities, types
│   ├── dist/               # Compiled output
│   ├── package.json        # Backend deps (Hono, Zod, node-forge)
│   ├── tsconfig.json       # TypeScript config
│   ├── vercel.json         # Vercel deployment config
│   └── wrangler.toml       # Cloudflare Workers config
│
├── .planning/              # GSD planning directory (this file lives here)
│   └── codebase/           # This mapping
│
├── .git/                   # Git repo root
├── .venv/                  # Python virtual environment (unused?)
└── .vscode/                # VS Code settings
```

## Key File Locations

| What you need | Where to find it |
|---------------|-----------------|
| App HTML structure | `index.html` |
| All page navigation logic | `index.js` — `showHomePage`, `showTrendingPage`, etc. |
| API endpoints | `index.js` top — `ENDPOINTS` constant |
| API base URL config | `index.js` top — `API_BASE_URL` IIFE |
| Song queue logic | `index.js` — `addToQueue`, `playNextInQueue` etc. |
| Audio playback | `index.js` — `loadSong`, `playSong` + `js/player.js` |
| Mini player UI | `js/player.js` + `js/mini-player-enhancements.js` |
| Fullscreen player | `js/fullscreen-player-enhancements.js` |
| Visualizer | `js/audio-visualizer.js` |
| User data (liked/playlists) | `index.js` — `loadUserData`, `saveUserData` |
| Brand colors/fonts | `styles/brand-identity.css` |
| Theme (noir/gold) | `styles/noir-gold-theme.css` |
| Backend routes | `jiosaavn-api/src/` modules |

## Naming Conventions

- **CSS classes:** kebab-case (`mini-player`, `fullscreen-player`, `song-card`)
- **JS variables:** camelCase (`currentSongIndex`, `songQueue`, `isShuffleEnabled`)
- **JS functions:** camelCase (`loadSong`, `playSong`, `showHomePage`)
- **IDs:** camelCase (`miniPlayer`, `fullscreenPlayer`, `searchInput`)
- **Files:** kebab-case (`mini-player-enhancements.js`, `audio-visualizer.css`)
- **CSS files in styles/:** kebab-case, descriptive (`micro-delights.css`, `noir-gold-theme.css`)

## Page Sections (in index.html)

All sections exist simultaneously in DOM, shown/hidden via JS:
| Section ID | Purpose |
|------------|---------|
| `.main-area` | Home page (default visible) |
| `#trending-page` | Full trending songs page |
| `#latest-page` | Latest releases page |
| `#artists-page` | Artists + rappers page |
| `#album-page` | Album detail page |
| `#favorites-page` | Liked songs page |
| `#playlists-page` | Playlists + suggestions page |
| `#miniPlayer` | Bottom sticky mini-player |
| `#fullscreenPlayer` | Full overlay player |
| `#loginModal` | Login modal (name + profile photo) |
