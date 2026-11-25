# Mehfil Backend API Documentation

Complete reference for the **Mehfil Music Backend** (`Hono` + `OpenAPI 3.1` + `Prisma` + `PostgreSQL`), crafted by **Sachin (`@mrtopr`)**.

- **Interactive API Docs (Scalar UI):** `GET /docs`
- **OpenAPI 3.1 JSON Spec:** `GET /swagger`
- **Landing Dashboard:** `GET /` (returns HTML in browsers, JSON when `Accept: application/json` is sent)

---

## 1. System & Health

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Mehfil API dashboard (HTML) or status JSON |
| `GET` | `/api/health` | Pings PostgreSQL (`SELECT 1`) with auto-reconnect and returns `{ ok, db, latencyMs, uptimeSeconds, timestamp }` |
| `GET` | `/docs` | Interactive Scalar API documentation |
| `GET` | `/swagger` | OpenAPI 3.1 JSON specification |

---

## 2. Authentication (`/api/auth`)

| Method | Endpoint | Body / Headers | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | `{ name, email, password }` | Creates a new user account and returns a 7-day JWT token |
| `POST` | `/api/auth/login` | `{ email, password }` | Authenticates user and returns `{ success, token, user }` |
| `GET` | `/api/auth/me` | `Authorization: Bearer <token>` | Verifies JWT and returns the current user profile |
| `POST` | `/api/auth/forgot-password` | `{ email }` | Generates a password reset token |
| `POST` | `/api/auth/reset-password` | `{ token, password }` | Resets password using a valid reset token |

---

## 3. Discovery & Search

| Method | Endpoint | Query Params | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/modules` | `language` (optional) | Trending songs, new release albums, and featured playlists |
| `GET` | `/api/search` | `query` | Global search across songs, albums, artists, and playlists |
| `GET` | `/api/search/songs` | `query`, `language`, `limit`, `page` | Scoped song search |
| `GET` | `/api/search/albums` | `query`, `language`, `limit`, `page` | Scoped album search |
| `GET` | `/api/search/artists` | `query`, `limit`, `page` | Scoped artist search |
| `GET` | `/api/search/playlists` | `query`, `language`, `limit`, `page` | Scoped playlist search |

---

## 4. Catalog Details

| Method | Endpoint | Query / Path Params | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/songs` | `ids` or `link` | Fetch song details and stream URLs |
| `GET` | `/api/songs/:id` | `id` | Fetch a single song by ID |
| `GET` | `/api/songs/:id/suggestions` | `id`, `limit` | Get song radio / next-track suggestions |
| `GET` | `/api/albums` | `id` or `link` | Fetch album metadata and tracklist |
| `GET` | `/api/artists` | `id` or `link` | Fetch artist profile, top songs, and albums |
| `GET` | `/api/artists/:id/songs` | `id`, `page` | Paginated artist songs |
| `GET` | `/api/playlists` | `id` or `link`, `page`, `limit` | Fetch playlist details and tracks |

---

## 5. Audio, YouTube, Lyrics & ML

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/audio/proxy` | CORS-safe audio download/stream proxy |
| `GET` | `/api/youtube/search` | Search YouTube music fallback |
| `GET` | `/api/youtube/stream` | Resolve playable audio stream |
| `GET` | `/api/lyrics` | Fetch synced / plain lyrics |
| `POST` | `/api/telemetry` | Record playback telemetry events |
| `GET` | `/api/ml/recommendations/:trackId` | Proxy track recommendations from `ml-service` |

---

## 6. Deployment & Environment Variables

### Vercel (`backend/`)
- **Build Command:** `npm run vercel-build` (runs `prisma generate && esbuild src/server.ts --bundle ...`)
- **Routing:** `vercel.json` rewrites `/(.*)` to `/api/index?__vpath=$1`, and `api/index.ts` restores the exact request path before handing off to Hono.
- **Required Env Vars in Vercel:**
  - `DATABASE_URL` — PostgreSQL connection string (e.g., Neon)
  - `JWT_SECRET` — Secret key for signing JWTs
  - `FRONTEND_URL` — Comma-separated allowed CORS origins (e.g., `https://playmehfil.vercel.app`)
  - `ML_SERVICE_URL` *(optional)* — Deployed URL of `ml-service`
