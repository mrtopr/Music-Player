# STACK.md — Mehfil Music Player

## Language & Runtime

### Frontend
- **Language:** Vanilla JavaScript (ES6+), HTML5, CSS3
- **Runtime:** Browser (no build step, no bundler)
- **Module system:** None — all scripts are global scope, loaded via `<script>` tags in `index.html`
- **Entry point:** `index.html` → loads `js/audio-fix.js` then `index.js` then 5 additional JS files

### Backend (jiosaavn-api/)
- **Language:** TypeScript 5.8.x
- **Runtime:** Bun v1.x (primary) or Node.js (via `@hono/node-server`)
- **Framework:** Hono v4.7.x (lightweight web framework)
- **Module system:** ES Modules (`"type": "module"`)
- **Build tool:** `tsc` + `tsc-alias` for path resolution
- **Deployment targets:** Cloudflare Workers (via `wrangler`) or Node.js server

## Frontend Dependencies

All loaded via CDN (no package.json for frontend):
- **Bootstrap Icons (bi):** Icon library — `bi-play-fill`, `bi-skip-start-fill`, etc.
- **Custom SVG icons:** Local SVGs in `Assets/flaticon/` (home, playlist, heart, settings, etc.)
- **No JS framework** — pure DOM manipulation

## Backend Dependencies (`jiosaavn-api/package.json`)

### Runtime
| Package | Version | Purpose |
|---------|---------|---------|
| `hono` | ^4.7.5 | Web framework + routing |
| `@hono/node-server` | ^1.14.0 | Node.js adapter for Hono |
| `@hono/zod-openapi` | ^0.19.2 | OpenAPI spec generation |
| `@hono/zod-validator` | ^0.4.3 | Request validation |
| `@scalar/hono-api-reference` | ^0.7.4 | API docs UI |
| `zod` | ^3.24.2 | Schema validation |
| `node-forge` | ^1.3.1 | Cryptography (DES decryption for audio URLs) |

### Dev Tools
| Package | Purpose |
|---------|---------|
| `vitest` | Testing framework |
| `eslint` + `prettier` | Linting + formatting |
| `commitlint` | Conventional commits enforcement |
| `wrangler` | Cloudflare Workers deploy |
| `changelogen` | Changelog generation |

## CSS Architecture

No preprocessor — vanilla CSS split across 13 files:
| File | Purpose |
|------|---------|
| `styles.css` | Main/global styles (138 KB) |
| `styles/brand-identity.css` | Mehfil brand colors, fonts |
| `styles/noir-gold-theme.css` | Noir + gold visual theme |
| `styles/player.css` | Base player controls |
| `styles/mini-player.css` | Bottom mini-player bar |
| `styles/fullscreen-player.css` | Fullscreen player overlay |
| `styles/audio-visualizer.css` | Visualizer bars/animations |
| `styles/premium-fullscreen.css` | Premium fullscreen enhancements |
| `styles/unified-cards.css` | Song/album card styles |
| `styles/card-hover-fix.css` | Card hover state fixes |
| `styles/micro-delights.css` | Micro-animations |
| `styles/feedback.css` | Notifications/toasts |
| `styles/flaticon-icons.css` | SVG icon sizing |

## Configuration

- `API_BASE_URL` determined dynamically at runtime in `index.js` (supports `?apiBase=` override, `localStorage` override, `file://` → localhost:3000, same-origin for production)
- Backend port: `3000` (default)
- No `.env` on frontend — all config is runtime JS
- Backend: no `.env` file found, config is runtime

## Version Control

- Git initialized in root (`d:\CODING\My Projects\Music Player`)
- Separate git repo inside `jiosaavn-api/` (upstream fork)
- No `.gitignore` found at root level (potential concern — see CONCERNS.md)
