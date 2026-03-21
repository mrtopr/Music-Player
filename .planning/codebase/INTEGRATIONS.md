# INTEGRATIONS.md — Mehfil Music Player

## Primary External Integration: JioSaavn API

### Overview
The frontend talks to a locally-hosted (or deployed) unofficial JioSaavn API backend.
The backend in turn scrapes/calls JioSaavn's internal APIs and returns structured JSON.

### Endpoint Map (defined in `index.js` ENDPOINTS constant)

| Key | Path | Purpose |
|-----|------|---------|
| `trendingSongs` | `/api/search/songs?query=bollywood%20trending%202024%20hits&language=hindi` | Home page trending section |
| `newReleasesAlbums` | `/api/search/songs?query=new%20hindi%20songs&language=hindi` | Home page new releases section |
| `popularArtists` | `/api/search/artists?query=arijit%20singh%20shreya%20ghoshal%20rahat%20fateh&language=hindi` | Home page artists section |
| `featuredPlaylists` | `/api/search/playlists?query=bollywood%20hits%20romantic&language=hindi` | Home page playlists section |
| `searchSongs` | `/api/search/songs` | Search functionality |
| `searchAlbums` | `/api/search/albums` | Search functionality |
| `searchArtists` | `/api/search/artists` | Search functionality |
| `searchPlaylists` | `/api/search/playlists` | Search functionality |
| `albumDetails` | `/api/albums?id=` | Album detail page |
| `playlistDetails` | `/api/playlists?id=` | Playlist detail page |
| `songDetails` | `/api/songs?id=` | Individual song fetch |
| `artistDetails` | `/api/artists?id=` | Artist detail page |

### API Base URL Resolution (runtime)
```js
// Priority order in index.js:
1. ?apiBase= URL query param
2. localStorage.getItem('mehfilApiBaseUrl')
3. file:// protocol → http://localhost:3000
4. localhost/127.0.0.1/private IP → http://{host}:3000
5. Production (same-origin, reverse proxy assumed) → ''
```

### Backend → JioSaavn
The `jiosaavn-api/` backend internally calls JioSaavn's undocumented APIs.
- Uses `node-forge` for DES decryption of encrypted audio stream URLs
- OpenAPI spec served at `/api/docs` via `@scalar/hono-api-reference`

## Audio Streaming

- Audio files served directly from JioSaavn CDN URLs
- URLs are decrypted by the backend (DES encryption used by JioSaavn)
- Frontend uses native HTML5 `<audio>` element with `src` set directly to the CDN URL
- No proxy — audio streams come directly from JioSaavn CDN to the browser

## Storage: Browser localStorage

All user data persisted client-side:
| Key | Contents |
|-----|---------|
| `mehfilLikedSongs` | JSON array of liked song objects |
| `mehfilUserPlaylists` | JSON array of user-created playlist objects |
| `mehfilApiBaseUrl` | Optional API base URL override |
| `userProfile` (inferred) | User name + profile picture from login modal |
| `musicHistory` / `playHistory` | Play count and last-played tracking |

## No Third-Party Auth

- No OAuth, no backend auth
- Login is purely local: user enters name + optional profile photo in a modal
- Data stored in localStorage only — no server-side user accounts

## No Analytics / Telemetry

- No analytics SDK detected
- No tracking pixels
- No error monitoring service (Sentry, etc.)

## Deployment

- Frontend: static file server or `file://` protocol (no build needed)
- Backend: Cloudflare Workers (`wrangler deploy`) or Node.js (`bun run start`)
- `vercel.json` in jiosaavn-api suggests Vercel deployment is also supported
