---
plan: 03-cleanup
phase: 1
wave: 2
depends_on: [01-vite-migration]
files_modified:
  - .gitignore
  - src/ui/fullscreen.js
  - src/player/engine.js
autonomous: true
requirements_addressed: [FOUND-03, FOUND-04, FOUND-05, FOUND-06]
---

# Plan: Dead Code Removal & Bug Fixes

## Objective

Remove all unused files (`test-script.js`, `.venv/`, `Assets/flaticon/`, `Assets/untitledui/`, `styles/flaticon-icons.css`), add a proper `.gitignore`, fix the `setInterval` memory leak in the waveform animation, merge duplicate function definitions (`generateWaveform`, `formatTime`), and properly integrate `audio-init-fix.js` into the module system.

## must_haves

- `test-script.js` deleted from project root
- `.venv/` deleted from project root
- `.gitignore` exists and includes `node_modules/`, `dist/`, `.venv/`
- No `setInterval` call without stored ID in waveform animation code
- Only one `generateWaveform()` function exists in the codebase
- Only one `formatTime()` function exists in the codebase
- `audio-init-fix.js` content is integrated into `src/player/engine.js`

## Tasks

### Task 1: Add `.gitignore` and Delete Unused Files

<read_first>
- Root directory listing (check what exists: test-script.js, .venv, Assets/flaticon, etc.)
</read_first>

<action>
Create `.gitignore` at project root:
```
# Dependencies
node_modules/

# Build output
dist/
.vite/

# Python environment (not used in this project)
.venv/
__pycache__/
*.pyc

# OS files
.DS_Store
Thumbs.db
desktop.ini

# Editor
.idea/
*.swp
*.swo

# Environment
.env
.env.local
.env.*.local

# Logs
*.log
npm-debug.log*
```

Delete unused files and directories:
```bash
# Windows PowerShell
Remove-Item "test-script.js" -Force -ErrorAction SilentlyContinue
Remove-Item ".venv" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "Assets\flaticon" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "Assets\untitledui" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "styles\flaticon-icons.css" -Force -ErrorAction SilentlyContinue
```

Note: `js/audio-fix.js`, `js/audio-init-fix.js`, `js/player.js`, `js/mini-player-enhancements.js`, `js/fullscreen-player-enhancements.js`, `js/audio-visualizer.js`, `js/scroll-progress.js`, `js/premium-fullscreen-audio.js` — keep for now as reference while migrating; they will be deleted once their logic is extracted into `src/` modules. Do NOT delete them in this plan.
</action>

<acceptance_criteria>
- `.gitignore` exists at project root
- `.gitignore` contains `node_modules/`
- `.gitignore` contains `dist/`
- `.gitignore` contains `.venv/`
- `test-script.js` does NOT exist: `test -f test-script.js && echo FAIL || echo PASS`
- `.venv/` does NOT exist: `test -d .venv && echo FAIL || echo PASS`
- `Assets/flaticon/` does NOT exist: `test -d Assets/flaticon && echo FAIL || echo PASS`
</acceptance_criteria>

---

### Task 2: Fix `setInterval` Memory Leak in Waveform Animation

<read_first>
- `index.js` lines 330–405 (updateWaveformAnimation function — the leak is here)
- `src/ui/fullscreen.js` (this function will be migrated here)
</read_first>

<action>
In `src/ui/fullscreen.js`, implement a clean waveform animation that stores and clears interval IDs:

```js
// At module scope:
let _waveformIntervals = [];

/**
 * Start/stop CSS-based waveform animation with proper cleanup
 * @param {boolean} isPlaying
 */
export function updateWaveformAnimation(isPlaying) {
  const fullscreenPlayer = document.getElementById('fullscreenPlayer');
  const bars = document.querySelectorAll('.waveform-bar');

  // ALWAYS clear existing intervals first (prevents accumulation)
  _waveformIntervals.forEach(id => clearInterval(id));
  _waveformIntervals = [];

  if (!fullscreenPlayer) return;

  if (isPlaying) {
    fullscreenPlayer.classList.add('playing');
    bars.forEach((bar, index) => {
      const id = setInterval(() => {
        if (Math.random() > 0.5) bar.classList.toggle('active');
      }, 700 + (index * 80));
      _waveformIntervals.push(id);
    });
  } else {
    fullscreenPlayer.classList.remove('playing');
    bars.forEach(bar => bar.classList.remove('active'));
  }
}

/**
 * Stop all waveform animation and clean up
 */
export function clearWaveformAnimation() {
  _waveformIntervals.forEach(id => clearInterval(id));
  _waveformIntervals = [];
  document.querySelectorAll('.waveform-bar').forEach(bar => bar.classList.remove('active'));
  document.getElementById('fullscreenPlayer')?.classList.remove('playing');
}
```

The old `updateWaveformAnimation()` and related code in `index.js` should NOT be called anymore — the `src/ui/fullscreen.js` version is canonical. If the old version still exists in `index.js` pending full migration, add a comment: `// DEPRECATED: use src/ui/fullscreen.js updateWaveformAnimation instead`.
</action>

<acceptance_criteria>
- `src/ui/fullscreen.js` contains `let _waveformIntervals = []`
- `src/ui/fullscreen.js` contains `_waveformIntervals.forEach(id => clearInterval(id))`
- `src/ui/fullscreen.js` contains `_waveformIntervals.push(id)`
- `src/ui/fullscreen.js` does NOT contain an unguarded bare `setInterval(` call (every setInterval result is pushed to the array)
</acceptance_criteria>

---

### Task 3: Consolidate Duplicate Functions

<read_first>
- `index.js` lines 333–345 (generateWaveform — 10 bars version)
- `js/player.js` lines 560–569 (generateWaveform — 20 bars version, KEEP this one)
- `index.js` lines 127–133 (formatTime)
- `js/player.js` lines 552–557 (formatMobileTimeValue — near-duplicate)
</read_first>

<action>
Create `src/utils/time.js` with the single canonical `formatTime`:
```js
/**
 * Format seconds to MM:SS string
 * @param {number} seconds
 * @returns {string}
 */
export function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);
  return `${minutes}:${remaining < 10 ? '0' : ''}${remaining}`;
}
```

Create `src/utils/waveform.js` with the single canonical `generateWaveform` (20 bars):
```js
/**
 * Generate waveform bars in a container element
 * @param {HTMLElement|string} container - element or selector
 * @param {number} barCount - number of bars (default 20)
 */
export function generateWaveform(container, barCount = 20) {
  const el = typeof container === 'string'
    ? document.querySelector(container)
    : container;
  if (!el) return;

  el.innerHTML = '';
  for (let i = 0; i < barCount; i++) {
    const bar = document.createElement('div');
    bar.className = 'waveform-bar';
    el.appendChild(bar);
  }
}
```

In all other files that define `generateWaveform` or `formatTime`/`formatMobileTimeValue`, add deprecation comment or replace with import from utils. The functions in `index.js` and `js/player.js` are source-of-truth during migration — once their callers are all migrated to import from utils, the old definitions can be removed.
</action>

<acceptance_criteria>
- `src/utils/time.js` exists and contains `export function formatTime(`
- `src/utils/waveform.js` exists and contains `export function generateWaveform(`
- `src/utils/waveform.js` contains `barCount = 20` default
- `src/utils/waveform.js` does NOT contain a 10-bar hardcoded loop (`i < 10`)
</acceptance_criteria>

---

### Task 4: Integrate `audio-init-fix.js`

<read_first>
- `js/audio-init-fix.js` (read full file — understand what it does)
- `src/player/engine.js` (where audio init logic lives)
</read_first>

<action>
Read `js/audio-init-fix.js` to understand what audio initialization fix it applies. Then:

1. Copy the fix logic into `src/player/engine.js` as part of the `initAudioEngine()` function that runs on startup.

2. Add a comment referencing the origin:
   ```js
   // Audio init fix (from js/audio-init-fix.js — was previously excluded from index.html)
   ```

3. The `js/audio-init-fix.js` file itself should be kept for reference until Phase 3 fully consolidates the player engine. Do NOT delete it yet — just ensure its logic is executed via the new module system.

4. In `src/main.js`, ensure `initAudioEngine()` is called early (before `initMiniPlayer()` and other player setup).
</action>

<acceptance_criteria>
- `src/player/engine.js` contains a comment referencing `audio-init-fix.js`
- `src/main.js` calls `initAudioEngine()` or imports and invokes the equivalent function
- `src/player/engine.js` contains the audio initialization code from `js/audio-init-fix.js`
</acceptance_criteria>

## Verification

```bash
# .gitignore check
test -f .gitignore && grep -q "node_modules" .gitignore && echo "PASS: .gitignore valid" || echo "FAIL"

# Deleted files check
test -f test-script.js && echo "FAIL: test-script.js still exists" || echo "PASS"
test -d .venv && echo "FAIL: .venv still exists" || echo "PASS"
test -d "Assets/flaticon" && echo "FAIL: flaticon still exists" || echo "PASS"

# setInterval leak fix
grep -n "setInterval" src/ui/fullscreen.js
# All setInterval results should go to _waveformIntervals.push(...)
grep -c "push(setInterval\|push(id)" src/ui/fullscreen.js
# Expected: ≥1 (interval IDs are tracked)

# Canonical utils exist
test -f src/utils/time.js && echo "PASS: time.js" || echo "FAIL"
test -f src/utils/waveform.js && echo "PASS: waveform.js" || echo "FAIL"

# audio-init-fix integrated
grep -q "audio-init-fix" src/player/engine.js && echo "PASS" || echo "FAIL"
```
