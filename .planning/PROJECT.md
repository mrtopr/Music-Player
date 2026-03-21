# Mehfil — दिल से सुनो

## What This Is

Mehfil is a premium Bollywood-focused web music player that streams music via the JioSaavn API. It targets music lovers who want a visually stunning, feature-complete streaming experience with a dark, poetic aesthetic. The v1.0 milestone transforms the existing vanilla JS prototype into a polished, Vite-powered SPA that matches and exceeds Spotify's feature set.

## Core Value

**Mehfil must play any song instantly with a beautiful, consistent, night-mode UI** — everything else is polish on top of this.

## Requirements

### Validated

<!-- From existing codebase — already working -->
- ✓ JioSaavn API integration via local jiosaavn-api backend — existing
- ✓ Home page with Trending, New Releases, Popular Artists, Featured Playlists — existing
- ✓ Search (songs, albums, artists, playlists) — existing
- ✓ Mini-player bar (bottom persistent) — existing
- ✓ Fullscreen player overlay — existing
- ✓ Liked songs (localStorage-persisted) — existing
- ✓ User playlists (localStorage-persisted) — existing
- ✓ Shuffle + Repeat modes — existing
- ✓ Queue management — existing
- ✓ Mood/category filtering — existing
- ✓ Login modal with name + profile photo — existing

### Active

<!-- v1.0 milestone scope -->

**Foundation**
- [ ] Migrate to Vite + vanilla JS ES modules (eliminate 10K-line monolith)
- [ ] Replace Bootstrap Icons + custom SVGs with Lucide Icons throughout
- [ ] Add .gitignore to root, remove test-script.js and unused files
- [ ] Fix setInterval leak in waveform animation
- [ ] Load audio-init-fix.js (currently excluded from index.html)

**Design System**
- [ ] Unified night-mode design system (CSS variables, no light mode)
- [ ] Unified song card design — identical across all sections
- [ ] Consistent typography using Inter/Outfit from Google Fonts
- [ ] Responsive layout — mobile, tablet, desktop (all breakpoints)
- [ ] Dynamic theme — extract album art dominant color, update UI accents

**Playback Engine**
- [ ] Rock-solid play/pause with correct state sync across mini/fullscreen/cards
- [ ] Cross-fade between songs (Web Audio API)
- [ ] Volume normalization
- [ ] Keyboard shortcuts (Space = play/pause, arrows = seek/track)
- [ ] Media Session API (OS media controls integration)

**Fullscreen Player**
- [ ] Complete fullscreen redesign — premium night-mode aesthetic
- [ ] Lyrics display (fetched from JioSaavn API or LRC fallback)
- [ ] WebAudio API visualizer bars synced to music
- [ ] Circular album art with breathing pulse animation
- [ ] Ambient color background matching current song

**Spotify Feature Parity**
- [ ] "Now Playing" view with queue sidebar
- [ ] Song radio / similar songs recommendations
- [ ] Recently played history
- [ ] Add to playlist from any song card context menu
- [ ] Artist detail page with top songs + albums
- [ ] Album detail page with full track list
- [ ] Playlist detail page
- [ ] Search results page with tabs (Songs / Albums / Artists / Playlists)

**Premium Features**
- [ ] Sleep timer (15m / 30m / 1h / end of song)
- [ ] Equalizer (bass, mid, treble sliders via Web Audio API)
- [ ] Song share button (copy link)

### Out of Scope

- Server-side user accounts / login — localStorage is sufficient; backend auth is out of scope for v1
- Social features (following, activity feed) — not relevant for solo music player
- Offline / download to device — JioSaavn ToS concern; deferred
- Modifying jiosaavn-api/ source files — treat as black box; only consume its API

## Context

- Existing codebase: brownfield vanilla HTML/CSS/JS SPA, no build pipeline
- ~10,100-line monolithic `index.js` — primary technical debt to resolve
- Two icon systems in use simultaneously (Bootstrap Icons CDN + local SVGs) — inconsistent
- Multiple duplicate function definitions across files (`generateWaveform` in 2 files, `formatTime` variants)
- `setInterval` leak in waveform animation (never cleared)
- `audio-init-fix.js` present but never loaded in `index.html`
- `.venv/` Python virtual environment exists at root with no Python code — leftover debris
- Backend: Hono/TypeScript/Bun API in `jiosaavn-api/` — do not modify, only consume
- Design direction: pure night mode, Bollywood/poetic branding ("Mehfil — दिल से सुनो"), warm gold accents on dark backgrounds

## Constraints

- **Backend:** Do not modify `jiosaavn-api/` directory — treat as an external dependency
- **Tech Stack:** Vite + vanilla JS ES modules (no framework like React/Vue)
- **Icons:** Lucide Icons only (remove Bootstrap Icons CDN and local SVG set)
- **Theme:** Night mode only — no light mode toggle
- **API:** JioSaavn via local jiosaavn-api backend — no other music API

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Vite + vanilla JS (not React) | Avoids rewrite complexity while solving the monolith; keeps bundle analysis simple | — Pending |
| Lucide Icons (replace Bootstrap Icons + SVG) | Single consistent icon system, tree-shakeable, matches minimal aesthetic | — Pending |
| localStorage for user data (no backend auth) | Simplest path; no backend changes; user data is non-critical | — Pending |
| Do not modify jiosaavn-api/ | Treat as stable dependency; avoid merge conflicts with upstream | — Pending |
| Pure night mode (no light toggle) | User explicitly requested; simplifies CSS surface area | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-22 after initialization*
