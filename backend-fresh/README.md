# Mehfil Backend (Fresh Build)

Freshly rebuilt music streaming backend for Mehfil, with the same JioSaavn-backed logic as the original deployed backend, plus BitChord-inspired features.

## Features

### Ported from existing backend (same logic)
- **Songs**: Get by IDs, by link, suggestions/station
- **Search**: Global search + scoped (songs, albums, artists, playlists)
- **Albums**: By ID or link
- **Artists**: By ID or link, songs, albums
- **Playlists**: JioSaavn playlists by ID or link
- **YouTube**: Search + stream resolution (Piped → JioSaavn → Invidious fallback)
- **Telemetry**: Playback events + listening stats
- **Recognition**: AudD audio fingerprinting
- **Modules/Trending**: Browse modules and trending content

### New BitChord-inspired features
- **Addons**: Pluggable music sources (`/api/addons/manifest`, `/api/addons/search`, `/api/addons/stream/{id}`)
- **Scrobble**: Last.fm / ListenBrainz scrobbling (`/api/scrobble`)
- **Favorites**: Like/unlike tracks (`/api/favorites`)
- **ML recommendations**: Proxy to FastAPI microservice (`/api/ml/recommendations/{trackId}`)

### Not included (by design)
- **Auth**: Disabled for now — all endpoints are public
- **Spotify**: Not integrated

## Stack
- Node.js / Bun / Cloudflare Workers (Hono)
- TypeScript
- Prisma + PostgreSQL
- Zod validation
- OpenAPI 3.1 + Scalar docs

## Local Development

```bash
cd backend-fresh

# Install dependencies
npm install

# Copy env config
cp .env.example .env
# Edit .env with your DATABASE_URL

# Generate Prisma client
npm run prisma:generate

# Push database schema
npm run prisma:push

# Start dev server
npm run dev
```

The API will run on `http://localhost:3001` (or `PORT` env var).
API docs available at `http://localhost:3001/docs`.

## Deployment

### Node.js (VPS / Railway / Render / Docker)
```bash
npm run build
npm start
```

### Cloudflare Workers
```bash
npm run build
npx wrangler deploy
```

### Vercel
```bash
vercel deploy
```

## Important Notes

- This is a **separate, fresh backend** — it does not modify the existing deployed `backend/` directory.
- Test locally first before pointing your frontend to this backend.
- JioSaavn integration is unofficial and may break if JioSaavn changes their API.
- YouTube stream resolution depends on community Piped/Invidious instances which may go offline.
