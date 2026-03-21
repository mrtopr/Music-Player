# ROADMAP.md — Mehfil v1.0

## Milestone: v1.0 — Premium Music Player

**Goal:** Transform Mehfil from a rough vanilla JS prototype into a polished, Vite-powered, Spotify-parity music player with night-mode aesthetic, dynamic theming, lyrics, sleep timer, cross-fade, and rock-solid playback.

---

## Phase 1: Foundation & Cleanup

**Goal:** Migrate to Vite, switch to Lucide Icons, remove dead code and duplicates, establish solid project structure.

**Requirements:** FOUND-01 through FOUND-06

**Plans:**
1/3 plans complete
- `2-icon-system` — Install `lucide` package, replace all Bootstrap Icons (`bi bi-*`) and local SVG `<img>` tags with Lucide icon components/SVG
- `3-cleanup` — Remove `test-script.js`, `.venv/`, unused CSS imports, add `.gitignore`, fix `setInterval` leaks, merge duplicate functions, add `audio-init-fix.js` to load chain

**Dependencies:** None

---

## Phase 2: Night-Mode Design System

**Goal:** Create a unified, consistent night-mode design language — tokens, typography, card design, spacing, and responsive grid.

**Requirements:** DESIGN-01 through DESIGN-04, DESIGN-06

**Plans:**
- `1-design-tokens` — CSS custom properties for colors, spacing, radius, shadows — pure dark palette with warm gold accents
- `2-typography` — Google Fonts (Inter), consistent type scale applied via CSS variables
- `3-unified-cards` — Single `.song-card` component design used everywhere (trending, search results, favorites, playlists, artist page, album page)
- `4-responsive-layout` — Media query audit: mobile (≤768px), tablet (769–1024px), desktop (≥1025px) for sidebar, main area, mini-player, fullscreen

**Dependencies:** Phase 1

---

## Phase 3: Playback Engine

**Goal:** Rock-solid audio playback with state sync, cross-fade, keyboard shortcuts, and OS media controls.

**Requirements:** PLAY-01 through PLAY-05

**Plans:**
- `1-playback-core` — Consolidate all playback logic into `src/player/engine.js`: play, pause, seek, volume, queue navigation. Remove player.js / mini-player-enhancements.js duplication
- `2-crossfade` — Web Audio API GainNode cross-fade implementation between songs (0–12s configurable)
- `3-keyboard-media` — Keyboard shortcuts (Space, arrows) + Media Session API (OS lock screen / notification controls)

**Dependencies:** Phase 1, Phase 2

---

## Phase 4: Spotify Feature Parity

**Goal:** Implement the full Spotify feature set — queue panel, radio, recently played, context menus, artist/album/playlist detail pages, search tabs, liked songs page.

**Requirements:** SPOT-01 through SPOT-09

**Plans:**
- `1-queue-radio` — Up Next queue panel (in fullscreen + mini-player), Song radio (fetch similar by artist/song ID)
- `2-history-context` — Recently played (localStorage, last 20), context menu on every card (Add to Queue / Add to Playlist / Like / Share)
- `3-detail-pages` — Artist page (top songs + albums), Album page (full tracklist + play all), Playlist page (songs + meta)
- `4-search-tabs` — Refactor search results into tabbed view: Songs / Albums / Artists / Playlists
- `5-liked-songs` — Liked Songs page redesign as proper list with play-all, sort, and duration

**Dependencies:** Phase 1, Phase 2, Phase 3

---

## Phase 5: Dynamic Album Art Theming

**Goal:** Extract the dominant color from the current song's album art using Canvas API and update UI accent colors dynamically.

**Requirements:** DESIGN-05, FS-05

**Plans:**
- `1-color-extractor` — Canvas-based dominant color extraction from album art image (via `<canvas>` + `getImageData`)
- `2-dynamic-theme` — Apply extracted color as `--accent-color` CSS variable; update mini-player glow, fullscreen background gradient, progress bar, buttons

**Dependencies:** Phase 2, Phase 3

---

## Phase 6: Fullscreen Player Redesign

**Goal:** Completely redesign the fullscreen player into a premium night-mode experience with lyrics, live visualizer, and ambient art.

**Requirements:** FS-01 through FS-04

**Plans:**
- `1-fullscreen-layout` — New fullscreen layout: left panel (album art, song info, controls), right panel (lyrics / queue toggle)
- `2-lyrics` — Fetch lyrics from JioSaavn API (`/api/songs?id=...` lyrics field), display synced scrolling text panel; fallback to "Lyrics not available"
- `3-visualizer` — Replace CSS-animation visualizer with live Web Audio API AnalyserNode driving canvas bars synced to actual audio frequency data
- `4-artwork-animation` — Circular album art with `border-radius: 50%` pulse breathing animation, subtle rotation when playing

**Dependencies:** Phase 2, Phase 3, Phase 5

---

## Phase 7: Premium Features

**Goal:** Sleep timer, 3-band equalizer, and share button.

**Requirements:** PREM-01 through PREM-03

**Plans:**
- `1-sleep-timer` — Sleep timer modal: 15m / 30m / 1h / end of song options; countdown shown in mini-player
- `2-equalizer` — 3-band equalizer (bass ≤200Hz, mid 200–2000Hz, treble ≥2000Hz) via Web Audio API BiquadFilterNode chain; EQ panel accessible from settings icon
- `3-share` — Share button on song cards and fullscreen: copies formatted text + URL to clipboard; shows copy-success toast

**Dependencies:** Phase 3

---

## Phase 8: Polish & QA

**Goal:** Final pass — UI consistency audit, performance, accessibility basics, and bugfix sweep.

**Plans:**
- `1-ui-audit` — Full visual sweep: check every screen for inconsistent padding, font sizes, icon sizes, missing hover states
- `2-performance` — Lazy-load images (IntersectionObserver), debounce search input, cancel in-flight fetch on new search
- `3-accessibility` — Add `aria-label` to all icon buttons, keyboard focus rings, skip-to-content link

**Dependencies:** All previous phases

---

## Summary

| Phase | Name | Key Deliverable |
|-------|------|----------------|
| 1 | Foundation & Cleanup | Vite project, Lucide icons, no dead code |
| 2 | Night-Mode Design System | Unified dark UI, consistent cards, responsive |
| 3 | Playback Engine | Solid play/pause, cross-fade, OS controls |
| 4 | Spotify Feature Parity | Queue, radio, history, detail pages, search tabs |
| 5 | Dynamic Theming | Album art color extraction → live UI accent |
| 6 | Fullscreen Redesign | Lyrics, live visualizer, ambient art |
| 7 | Premium Features | Sleep timer, EQ, share |
| 8 | Polish & QA | Consistency audit, performance, a11y |
