# Requirements: Mehfil Music Player

**Defined:** 2026-03-22
**Core Value:** Mehfil must play any song instantly with a beautiful, consistent, night-mode UI

## v1 Requirements

### Foundation

- [ ] **FOUND-01**: Project migrated to Vite with ES module splitting (no 10K-line monolith)
- [ ] **FOUND-02**: Lucide Icons replaces Bootstrap Icons CDN + local SVG set throughout
- [ ] **FOUND-03**: Root `.gitignore` added; `test-script.js`, `.venv/` removed
- [ ] **FOUND-04**: `setInterval` leak fixed in waveform animation
- [ ] **FOUND-05**: `audio-init-fix.js` properly integrated (was excluded from HTML)
- [ ] **FOUND-06**: Duplicate function definitions removed (`generateWaveform`, `formatTime` variants)

### Design System

- [ ] **DESIGN-01**: Unified night-mode CSS design system (variables, no light mode)
- [ ] **DESIGN-02**: All song/album/artist/playlist cards share identical component design
- [ ] **DESIGN-03**: Inter or Outfit font from Google Fonts applied consistently
- [ ] **DESIGN-04**: Responsive layout passes on mobile (≤768px), tablet (769–1024px), desktop (≥1025px)
- [ ] **DESIGN-05**: Dynamic accent color — extract dominant color from album art, update UI
- [ ] **DESIGN-06**: Consistent spacing, border-radius, and shadow system throughout

### Playback Engine

- [ ] **PLAY-01**: Play/pause state correctly synchronized across mini-player, fullscreen, and all cards
- [ ] **PLAY-02**: Cross-fade transition between songs (configurable 0–12 seconds)
- [ ] **PLAY-03**: Keyboard shortcuts: Space (play/pause), ← → (seek 10s), Alt+← → (prev/next track)
- [ ] **PLAY-04**: Media Session API integration (OS media notifications + lock screen controls)
- [ ] **PLAY-05**: Volume persisted across sessions via localStorage

### Fullscreen Player

- [ ] **FS-01**: Premium fullscreen redesign with night-mode ambient aesthetic
- [ ] **FS-02**: Lyrics panel — displayed when available from JioSaavn API
- [ ] **FS-03**: WebAudio API visualizer bars synced to live audio data (not CSS animation)
- [ ] **FS-04**: Circular album art with breathing pulse animation
- [ ] **FS-05**: Ambient gradient background derived from album art dominant color

### Spotify Features

- [ ] **SPOT-01**: "Up Next" queue panel visible in fullscreen and mini-player
- [ ] **SPOT-02**: Song radio — load similar songs based on current song/artist
- [ ] **SPOT-03**: Recently played section on home page (last 20 songs, localStorage)
- [ ] **SPOT-04**: Context menu on every song card: Add to Queue, Add to Playlist, Like, Share
- [ ] **SPOT-05**: Artist detail page: top songs, albums grid, biography blurb
- [ ] **SPOT-06**: Album detail page: full track listing with duration, play all button
- [ ] **SPOT-07**: Playlist detail page: all songs, created by, total duration
- [ ] **SPOT-08**: Search results page with 4 tabs: Songs / Albums / Artists / Playlists
- [ ] **SPOT-09**: "Liked Songs" page shows all liked songs as a formatted list with play all

### Premium Features

- [ ] **PREM-01**: Sleep timer — options: 15m, 30m, 1h, end of current song
- [ ] **PREM-02**: Equalizer — 3-band (bass, mid, treble) via Web Audio API BiquadFilter
- [ ] **PREM-03**: Share song — copies a shareable link to clipboard with song info

## v2 Requirements

### Advanced Audio
- **ADV-01**: Crossfade with fade curve preview in settings
- **ADV-02**: Audio normalization (ReplayGain equivalent via gain node)
- **ADV-03**: Gapless playback between album tracks

### Social / Discovery
- **DISC-01**: Trending charts by language/region
- **DISC-02**: "Made for You" AI recommendations
- **DISC-03**: Artist radio stations

## Out of Scope

| Feature | Reason |
|---------|--------|
| Server-side user accounts | localStorage sufficient for v1; backend auth adds major complexity |
| Offline/download songs | JioSaavn ToS concern; storage complexity |
| Social features (following, feed) | Not relevant for solo player |
| Light mode | User explicitly requested night-only |
| Modifying jiosaavn-api/ | Treat as black-box external dependency |
| Mobile native app | Web-first; PWA is acceptable future enhancement |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Pending |
| FOUND-02 | Phase 1 | Pending |
| FOUND-03 | Phase 1 | Pending |
| FOUND-04 | Phase 1 | Pending |
| FOUND-05 | Phase 1 | Pending |
| FOUND-06 | Phase 1 | Pending |
| DESIGN-01 | Phase 2 | Pending |
| DESIGN-02 | Phase 2 | Pending |
| DESIGN-03 | Phase 2 | Pending |
| DESIGN-04 | Phase 2 | Pending |
| DESIGN-05 | Phase 5 | Pending |
| DESIGN-06 | Phase 2 | Pending |
| PLAY-01 | Phase 3 | Pending |
| PLAY-02 | Phase 3 | Pending |
| PLAY-03 | Phase 3 | Pending |
| PLAY-04 | Phase 3 | Pending |
| PLAY-05 | Phase 3 | Pending |
| FS-01 | Phase 6 | Pending |
| FS-02 | Phase 6 | Pending |
| FS-03 | Phase 6 | Pending |
| FS-04 | Phase 6 | Pending |
| FS-05 | Phase 5 | Pending |
| SPOT-01 | Phase 4 | Pending |
| SPOT-02 | Phase 4 | Pending |
| SPOT-03 | Phase 4 | Pending |
| SPOT-04 | Phase 4 | Pending |
| SPOT-05 | Phase 4 | Pending |
| SPOT-06 | Phase 4 | Pending |
| SPOT-07 | Phase 4 | Pending |
| SPOT-08 | Phase 4 | Pending |
| SPOT-09 | Phase 4 | Pending |
| PREM-01 | Phase 7 | Pending |
| PREM-02 | Phase 7 | Pending |
| PREM-03 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 33 total
- Mapped to phases: 33
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-22*
*Last updated: 2026-03-22 after initial definition*
