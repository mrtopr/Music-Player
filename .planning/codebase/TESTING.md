# TESTING.md — Mehfil Music Player

## Frontend Testing

**No testing framework configured for the frontend.**

- `test-script.js` exists at root (910 bytes) — appears to be a manual scratch/test file, not a formal test suite
- No Jest, Mocha, Vitest, or Cypress configuration found
- No `package.json` at root (frontend has no build pipeline)

### Current Testing Approach
Manual browser testing only. There are `console.log` statements with emoji prefixes throughout `index.js` to aid debugging during development.

Some self-test code exists inline:
```js
// In initializeMoodFilteringSystem() — runs after 2s delay
setTimeout(() => {
  const testSongs = [
    { name: 'Tum Hi Ho', primaryArtists: 'Arijit Singh' },
    { name: 'Party Tonight', primaryArtists: 'DJ Mix' },
    // ...
  ];
  testSongs.forEach(song => {
    const enriched = enrichSong(song);
    console.log(`🎵 "${song.name}" → mood: ${enriched.mood}`);
  });
}, 2000);
```

## Backend Testing (jiosaavn-api/)

**Vitest** is configured and used.

### Framework
- `vitest` v3.0.9 + `@vitest/ui` for interactive test browser
- `@vitest/coverage-v8` for code coverage
- Config: `jiosaavn-api/vitest.config.ts`

### Test Commands (run from `jiosaavn-api/`)
```bash
bun run test           # Run all tests
bun run test:ui        # Interactive Vitest UI
```

### Test Structure
- Tests likely located in `jiosaavn-api/src/` or `jiosaavn-api/api/` (not explored in detail)
- Tests run as a prerequisite to releases (`"prerelease": "bun run test"`)

### CI
- `.github/` directory exists in `jiosaavn-api/` — likely has GitHub Actions workflow
- Pre-commit hooks run `lint` + `format` (via `simple-git-hooks`)

## Test Coverage Gaps

Since there are **no frontend tests**, these areas are completely untested automatically:
- Audio playback flow (`loadSong` → `playSong` → `audio.play()`)
- Mood filtering logic (`enrichSong`, `applyMoodFilter`)
- Queue management (`addToQueue`, `removeFromQueue`, `playNextInQueue`)
- Liked songs persistence (localStorage read/write)
- Page navigation (show/hide sections)
- Mini-player display synchronization
- Fullscreen player open/close
- Search functionality
- API error handling and fallback UI

## Recommendations for Testing

When adding tests, the following approach would be most practical given the vanilla JS architecture:
1. **Playwright or Cypress** for end-to-end browser tests — best fit for testing UI interactions
2. **Extract pure functions** from `index.js` (like `enrichSong`, queue logic) into separate modules for unit testing with Vitest or Jest
3. **Mock the `<audio>` element** for playback tests (HTML5 audio doesn't work in Node.js without jsdom/puppeteer)
