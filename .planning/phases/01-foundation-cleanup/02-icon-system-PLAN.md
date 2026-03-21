---
plan: 02-icon-system
phase: 1
wave: 2
depends_on: [01-vite-migration]
files_modified:
  - src/main.js
  - src/ui/icons.js
  - index.html
  - styles.css
  - styles/mini-player.css
  - styles/fullscreen-player.css
  - styles/player.css
autonomous: true
requirements_addressed: [FOUND-02]
---

# Plan: Lucide Icon System

## Objective

Replace the dual icon system (Bootstrap Icons CDN + local SVG `<img>` files in `Assets/flaticon/`) with a single, consistent Lucide Icons implementation. All icon references in HTML and JavaScript must use Lucide. Remove `styles/flaticon-icons.css` and all `<img src="Assets/flaticon/...">` tags.

## must_haves

- Every icon visible on screen (sidebar, top bar, mini-player, fullscreen controls, card buttons) uses Lucide
- No `bi bi-*` class references remain in HTML or JS files
- No `<img src="Assets/flaticon` references remain in HTML or JS files
- Icon sizes are visually consistent (24px default, 20px for controls, 16px for inline)

## Tasks

### Task 1: Create Icon Utility Module

<read_first>
- `src/main.js` (add icons import here)
- `.planning/phases/01-foundation-cleanup/01-RESEARCH.md` (full Lucide icon mapping table)
</read_first>

<action>
Install Lucide if not already done during Vite migration:
```bash
npm install lucide
```

Create `src/ui/icons.js`:
```js
import {
  Play, Pause, SkipBack, SkipForward,
  Volume2, Volume1, VolumeX,
  Heart, Shuffle, Repeat, Repeat1,
  Music, ListMusic, Search, Maximize2,
  ChevronDown, ChevronLeft, ChevronRight, X,
  Flame, Mic, Mic2, Menu,
  ArrowLeft, ArrowRight,
  Home, Settings, LogOut,
  Plus, Check, Clock, Share2,
  Star, MoreHorizontal
} from 'lucide';

/**
 * Create a Lucide icon element
 * @param {Function} Icon - Lucide icon constructor
 * @param {Object} opts - { size, strokeWidth, class }
 * @returns {SVGElement}
 */
export function icon(Icon, opts = {}) {
  const { size = 24, strokeWidth = 2, className = '' } = opts;
  const el = Icon({
    width: size,
    height: size,
    'stroke-width': strokeWidth,
    class: `lucide-icon ${className}`.trim()
  });
  return el;
}

// Named icon factories for common use
export const Icons = {
  play: (opts) => icon(Play, opts),
  pause: (opts) => icon(Pause, opts),
  skipBack: (opts) => icon(SkipBack, opts),
  skipForward: (opts) => icon(SkipForward, opts),
  volumeHigh: (opts) => icon(Volume2, opts),
  volumeLow: (opts) => icon(Volume1, opts),
  volumeMute: (opts) => icon(VolumeX, opts),
  heart: (opts) => icon(Heart, opts),
  shuffle: (opts) => icon(Shuffle, opts),
  repeat: (opts) => icon(Repeat, opts),
  repeat1: (opts) => icon(Repeat1, opts),
  music: (opts) => icon(Music, opts),
  listMusic: (opts) => icon(ListMusic, opts),
  search: (opts) => icon(Search, opts),
  maximize: (opts) => icon(Maximize2, opts),
  chevronDown: (opts) => icon(ChevronDown, opts),
  chevronLeft: (opts) => icon(ChevronLeft, opts),
  chevronRight: (opts) => icon(ChevronRight, opts),
  close: (opts) => icon(X, opts),
  flame: (opts) => icon(Flame, opts),
  mic: (opts) => icon(Mic, opts),
  mic2: (opts) => icon(Mic2, opts),
  menu: (opts) => icon(Menu, opts),
  arrowLeft: (opts) => icon(ArrowLeft, opts),
  arrowRight: (opts) => icon(ArrowRight, opts),
  home: (opts) => icon(Home, opts),
  settings: (opts) => icon(Settings, opts),
  logOut: (opts) => icon(LogOut, opts),
  plus: (opts) => icon(Plus, opts),
  clock: (opts) => icon(Clock, opts),
  share: (opts) => icon(Share2, opts),
  more: (opts) => icon(MoreHorizontal, opts),
};

/**
 * Sets an element's icon, clearing previous icon content
 * @param {HTMLElement} el
 * @param {string} iconName - key in Icons
 * @param {Object} opts
 */
export function setIcon(el, iconName, opts = {}) {
  el.innerHTML = '';
  const iconEl = Icons[iconName]?.(opts);
  if (iconEl) el.appendChild(iconEl);
}

/**
 * Replaces Bootstrap icon class references with Lucide
 * Call once on DOMContentLoaded for any remaining <i class="bi bi-*"> tags
 */
export function replaceBootstrapIcons() {
  const map = {
    'bi-play-fill': 'play',
    'bi-pause-fill': 'pause',
    'bi-skip-start-fill': 'skipBack',
    'bi-skip-end-fill': 'skipForward',
    'bi-volume-up': 'volumeHigh',
    'bi-volume-down': 'volumeLow',
    'bi-volume-mute': 'volumeMute',
    'bi-heart': 'heart',
    'bi-heart-fill': 'heart',
    'bi-shuffle': 'shuffle',
    'bi-arrow-repeat': 'repeat',
    'bi-repeat-1': 'repeat1',
    'bi-music-note': 'music',
    'bi-music-note-list': 'listMusic',
    'bi-search': 'search',
    'bi-arrows-angle-expand': 'maximize',
    'bi-chevron-down': 'chevronDown',
    'bi-chevron-left': 'chevronLeft',
    'bi-chevron-right': 'chevronRight',
    'bi-x-lg': 'close',
    'bi-fire': 'flame',
    'bi-mic-fill': 'mic2',
    'bi-three-dots': 'more',
    'bi-arrow-left': 'arrowLeft',
    'bi-arrow-right': 'arrowRight',
    'bi-plus-circle': 'plus',
    'bi-magic': 'star',
    'bi-camera': 'plus',
    'bi-collection-play': 'listMusic',
  };

  document.querySelectorAll('i[class*="bi-"]').forEach(el => {
    const classes = Array.from(el.classList);
    for (const cls of classes) {
      if (cls.startsWith('bi-') && map[cls]) {
        setIcon(el, map[cls], { size: 20 });
        el.classList.remove('bi', cls);
        break;
      }
    }
  });
}
```

Add to `src/main.js` (inside DOMContentLoaded handler, after other inits):
```js
import { replaceBootstrapIcons } from './ui/icons.js';
// ... in DOMContentLoaded:
replaceBootstrapIcons();
```
</action>

<acceptance_criteria>
- `src/ui/icons.js` exists
- `src/ui/icons.js` contains `export function icon(`
- `src/ui/icons.js` contains `export const Icons =`
- `src/ui/icons.js` contains `export function replaceBootstrapIcons(`
- `src/main.js` contains `import { replaceBootstrapIcons }`
</acceptance_criteria>

---

### Task 2: Replace SVG `<img>` Tags in HTML

<read_first>
- `index.html` (search for all `Assets/flaticon/` references)
</read_first>

<action>
Replace every `<img src="Assets/flaticon/..." class="icon-svg">` in `index.html` with a `<i data-lucide="icon-name">` data-attribute placeholder that `replaceBootstrapIcons()` or a dedicated init function will replace:

Instead, replace each with the appropriate `<i class="bi bi-xxx">` equivalent — `replaceBootstrapIcons()` will automatically convert them on DOMContentLoaded.

Specific replacements in `index.html`:
```html
<!-- home.svg → -->
<i class="bi bi-house-fill"></i>

<!-- playlist.svg → -->
<i class="bi bi-music-note-list"></i>

<!-- heart.svg → -->
<i class="bi bi-heart"></i>

<!-- settings.svg → -->
<i class="bi bi-gear"></i>

<!-- logout.svg → -->
<i class="bi bi-box-arrow-right"></i>

<!-- list.svg (hamburger) → -->
<i class="bi bi-list"></i>

<!-- search.svg → -->
<i class="bi bi-search"></i>

<!-- fire.svg → -->
<i class="bi bi-fire"></i>

<!-- arrow-right.svg (Show More) → -->
<i class="bi bi-arrow-right"></i>

<!-- arrow-left.svg (Back) → -->
<i class="bi bi-arrow-left"></i>

<!-- mic.svg → -->
<i class="bi bi-mic"></i>

<!-- chevron-left/right.svg → -->
<i class="bi bi-chevron-left"></i>
<i class="bi bi-chevron-right"></i>
```

Additionally, update `replaceBootstrapIcons()` in `src/ui/icons.js` to handle these additional classes:
- `bi-house-fill` → `home`
- `bi-gear` → `settings`
- `bi-box-arrow-right` → `logOut`
- `bi-list` → `menu`
- `bi-mic` → `mic`
- `bi-star-fill` → `star`
- `bi-plus-circle` → `plus`
- `bi-plus` → `plus`
- `bi-collection-play-fill` → `listMusic`

Remove `class="icon-svg"` from replaced elements — it was only used for SVG sizing via `flaticon-icons.css`.

Remove the `styles/flaticon-icons.css` `<link>` from `index.html` if still present (it should be removed, since it's excluded from `src/styles/main.css`).
</action>

<acceptance_criteria>
- `index.html` contains 0 occurrences of `Assets/flaticon`
- `index.html` contains 0 occurrences of `class="icon-svg"`
- `index.html` contains 0 occurrences of `flaticon-icons.css`
- `index.html` contains `<i class="bi bi-house-fill">` or equivalent in the sidebar nav
</acceptance_criteria>

---

### Task 3: Add Lucide CSS Defaults

<read_first>
- `src/styles/main.css` (add after existing imports)
</read_first>

<action>
Add to the end of `src/styles/main.css`:
```css
/* === Lucide Icon Defaults === */
.lucide-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  vertical-align: middle;
}

/* Filled heart for liked songs */
.liked .lucide-icon path,
.lucide-icon.liked path {
  fill: currentColor;
}

/* Sidebar nav icons */
.sidebar ul li .lucide-icon {
  width: 20px;
  height: 20px;
}

/* Control button icons */
.btn-icon .lucide-icon,
button .lucide-icon {
  pointer-events: none;
}
```
</action>

<acceptance_criteria>
- `src/styles/main.css` contains `.lucide-icon {`
- `src/styles/main.css` contains `.liked .lucide-icon path`
</acceptance_criteria>

---

### Task 4: Smoke Test Icons

<read_first>
- `index.html` (verify no remaining icon-svg or flaticon references)
- `src/ui/icons.js` (verify exports)
</read_first>

<action>
Run verification checks:
```bash
# Check for remaining SVG img tags
grep -rn "Assets/flaticon" index.html src/
# Expected: 0 results

# Check for remaining Bootstrap Icons CDN
grep -rn "bootstrap-icons" index.html src/ styles/
# Expected: 0 results (CDN removed)

# Check for remaining bi- class references
grep -rn "class=\"bi bi-" index.html
# Expected: only the placeholder classes before replaceBootstrapIcons() runs — acceptable
```

Open `npm run dev` and visually verify:
- Sidebar icons (Home, Playlists, Favorites, Settings, Logout) show crisp Lucide icons
- Top bar search icon shows Lucide Search
- Mini-player play/skip icons show Lucide icons
</action>

<acceptance_criteria>
- `grep "Assets/flaticon" index.html` returns 0 results
- `grep "flaticon-icons.css" index.html` returns 0 results
- Lucide icons are visible in the sidebar in the browser
</acceptance_criteria>

## Verification

```bash
# No flaticon references
grep -rn "Assets/flaticon" index.html src/ | wc -l
# Expected: 0

# No Bootstrap CDN
grep -rn "cdn.jsdelivr.net/npm/bootstrap-icons" index.html index.html src/ | wc -l
# Expected: 0

# Lucide icons module exists
test -f src/ui/icons.js && echo "PASS" || echo "FAIL"

# Icons export exists
grep -q "export const Icons" src/ui/icons.js && echo "PASS" || echo "FAIL"
```
