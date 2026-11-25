# Mehfil Backend

High-fidelity music streaming, multi-universe discovery, authentication, and ML recommendation proxy backend for **Mehfil** — crafted by **Sachin (`@mrtopr`)**.

## Core Endpoints
- **Health**: `GET /api/health` (verifies PostgreSQL connectivity and keeps serverless DB warm)
- **Discovery**: `GET /api/modules`, `GET /api/search/{songs|albums|artists|playlists}`
- **Catalog**: `GET /api/songs`, `GET /api/albums`, `GET /api/artists`, `GET /api/playlists`
- **Auth**: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- **Audio & Sync**: `GET /api/audio/*`, `GET /api/youtube/*`, `GET /api/lyrics/*`
- **ML & Telemetry**: `POST /api/telemetry`, `GET /api/ml/recommendations/{trackId}`

## Local Development
```bash
cd backend
npm install
cp .env.example .env
npm run prisma:generate
npm run dev
```

API runs on `http://localhost:3001` with interactive docs at `http://localhost:3001/docs`.

## Vercel Deployment
`vercel.json` runs `npm run vercel-build` (`prisma generate && esbuild src/server.ts --bundle ...`) and serves through `api/index.ts`.
Set `DATABASE_URL`, `JWT_SECRET`, and `FRONTEND_URL` in Vercel Environment Variables.
