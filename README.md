# Mehfil — दिल से सुनो 🎵

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Hono](https://img.shields.io/badge/Hono-Edge%20API-E36002?logo=fastly&logoColor=white)](https://hono.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)

**Mehfil** (महफ़िल) is a production-ready, AI-driven music streaming web application crafted specifically for high-fidelity Bollywood, Indian, and global music discovery. Combining an ambient glassmorphic interface with an edge-ready API and an autonomous machine learning recommendation engine, Mehfil delivers a personalized listening journey.

---

## ✨ Comprehensive Feature Matrix

### 🎧 1. High-Fidelity Audio Streaming & Fallback
- **Multi-bitrate Streaming**: Up to 320 kbps AAC/MP3 high-bitrate streaming with seamless adaptive bitrate switching for slower connections.
- **YouTube Fallback Engine**: If a song is unavailable in the primary library, an automated YouTube integration streams and buffers the audio invisibly.
- **Direct Downloads**: Download audio tracks directly in up to 320 kbps quality with accurate ID3 tags and album cover art.

### 🤖 2. Machine Learning Recommendations & Dynamic Taste Profiles
- **Vector Space Embeddings**: Tracks are represented as multi-dimensional feature vectors (BPM, Energy, Danceability, Valence, Acousticness).
- **Cosine Similarity Engine**: Microservice calculates distance in real time to recommend contextually coherent next tracks.
- **Reinforcement Learning from Telemetry**:
  - Listening to >70% of a track pulls the user’s taste vector closer to that track's profile.
  - Skipping in the first 30 seconds immediately pushes the user's vector away.
- **Circadian Context Pacing**: ML adjusts tempo (BPM) and valence thresholds depending on user's local hour (e.g., lower BPM, chill vibes at night).

### 👥 3. "Listen Together" Real-Time Synchronized Rooms
- **Room Sync Protocol**: Host or join shared listening rooms via lightweight WebSockets (PieSocket).
- **Sub-second Sync**: Play, pause, seek, and queue modifications synchronize instantaneously across all connected peers.
- **Zero-Friction Sharing**: Generate shareable room codes and links with a single click.

### 🎨 4. Adaptive Glassmorphic UI & Ambient Aesthetics
- **Dynamic Palette Extraction**: Real-time palette extraction powered by Node-Vibrant analyzes album art and morphs background lighting, borders, and buttons dynamically.
- **Immersive Fullscreen Player**: Includes full visualizer canvas, live animated background mesh, queue drawer, and distraction-free playback.
- **Responsive & Mobile-First**: Native-feeling mobile tab bar, touch swipe gestures, and sleek bottom mini-player.

### 🎬 5. Bollywood Movie Soundtracks & Archive Collection
- **Curated Movie Discographies**: Dedicated sections for Hindi cinema classics, 90s nostalgia, golden 70s-80s era, and recent blockbusters.
- **Internet Archive Integration**: Direct access to archival recordings and retro collections.
- **Movie Download Hub**: Instant high-quality audio downloads organized by movie albums.

### 🎚️ 6. 10-Band Graphic Equalizer & Audio Engine
- **Web Audio API DSP Engine**: Real-time hardware-accelerated audio processing.
- **Curated Presets**: Bass Boost, Vocal Enhancer, Acoustic, Rock, Electronic, Treble Boost, and Custom 10-band slider controls.
- **Smart Volume Normalization**: Prevents sudden loud bursts across differing track masters.

### 📜 7. Synchronized Real-Time Lyrics
- **Karaoke Scrolling**: Line-by-line synchronized scrolling lyrics with smooth active line glow.
- **Interactive Seek**: Tap on any lyric line to jump directly to that point in the song.

### 🎙️ 8. Shazam-Style Audio Recognition
- **Acoustic Fingerprinting**: Recognize songs playing in your physical surroundings via microphone capture and instant fingerprint matching.

### 📦 9. Progressive Web App (PWA) & Offline Mode
- **Installable Desktop & Mobile App**: Add to Home Screen on iOS, Android, macOS, and Windows.
- **Offline Storage**: IndexedDB caching for liked songs, playlists, recently played history, and playback settings.

### 🔐 10. Enterprise-Grade Security & Authentication
- **Stateful JWT Authentication**: Secure password hashing with `bcryptjs` and hardened JWT session management.
- **Database Backed**: User profiles, custom playlists, favorites, and listening history backed by PostgreSQL via Prisma ORM.
- **No Credential Leaks**: All secrets are strictly managed through environment variables (`.env.example` templates provided).

---

## 🏛️ System Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                 React 19 Frontend (Vite + PWA)              │
│       Zustand State • Web Audio DSP • Vibrant Theme Engine  │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
     HTTP/REST (OpenAPI)             WebSocket Sync
               │                              │
               ▼                              ▼
┌──────────────────────────────┐  ┌───────────────────────────┐
│     Hono Edge Backend        │  │     PieSocket Gateway     │
│  Cloudflare Workers / Node   │  │   (Listen Together Sync)  │
└──────┬───────────────┬───────┘  └───────────────────────────┘
       │               │
       ▼               ▼
┌──────────────┐  ┌────────────────────────────┐
│  PostgreSQL  │  │  FastAPI ML Microservice   │
│ (Prisma ORM) │  │  Scikit-Learn • Vectors    │
└──────────────┘  └────────────────────────────┘
```

---

## 📁 Repository Structure

```text
.
├── backend/                  # Hono TypeScript API Service (Node / Cloudflare Edge)
│   ├── api/                  # Vercel / Cloudflare serverless entry points
│   ├── prisma/               # Database schema & migrations (PostgreSQL)
│   ├── src/
│   │   ├── modules/          # Auth, Telemetry, JioSaavn, Search, YouTube, etc.
│   │   ├── app.ts            # Hono application routing & middleware
│   │   └── server.ts         # Dual runtime server (Node.js + Edge)
│   ├── .env.example          # Environment variables template
│   ├── wrangler.toml         # Cloudflare Workers configuration
│   └── package.json
│
├── frontend/                 # React 19 Single Page Application
│   ├── public/               # Static icons, manifest, service worker
│   ├── src/
│   │   ├── api/              # HTTP clients (JioSaavn, Archive, Auth, Telemetry)
│   │   ├── components/       # Reusable UI (Player, Equalizer, Modals, Layout)
│   │   ├── pages/            # View routers (Home, Search, Library, Artists, MovieSongs)
│   │   ├── store/            # Zustand global stores (Player, Auth, Queue, Sync)
│   │   └── utils/            # Web Audio engine, Vibrant extractor, ML recommendations
│   ├── .env.example          # Frontend environment variables template
│   └── vite.config.js        # Vite bundler configuration
│
├── ml-service/               # Python Recommendation Engine
│   ├── main.py               # FastAPI server & Cosine Vector Matcher
│   ├── seed_data.py          # Data seeding tools
│   └── requirements.txt      # Python dependencies
│
└── README.md                 # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** >= 18.0.0
- **Python** >= 3.10 (for the optional ML microservice)
- **PostgreSQL** database (e.g., [Neon](https://neon.tech), [Supabase](https://supabase.com), or local)

---

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Copy environment template and configure secrets:
   ```bash
   cp .env.example .env
   ```
   *Fill in `DATABASE_URL` and generate a strong `JWT_SECRET`.*
3. Install dependencies:
   ```bash
   npm install
   ```
4. Generate Prisma client & push schema:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
5. Start development server:
   ```bash
   npm run dev
   ```
   *The API will run on `http://localhost:3000` (or `PORT` specified).*

---

### 2. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Copy environment template:
   ```bash
   cp .env.example .env
   ```
   *Leave `VITE_API_URL` empty to use the built-in Vite dev proxy, or point to your deployed backend.*
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start development server:
   ```bash
   npm run dev
   ```
   *Visit `http://localhost:5173` in your browser.*

---

### 3. ML Service Setup (Optional)

1. Navigate to the ML service directory:
   ```bash
   cd ../ml-service
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the microservice:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

---

## 🔒 Security & Privacy Practices

- **Zero Secret Commits**: Real database credentials, API tokens, and JWT secrets are strictly gitignored. Both `frontend` and `backend` include sanitized `.env.example` templates.
- **Scoped CORS Configuration**: Production environments restrict cross-origin requests to explicit, authorized domains.
- **Password Protection**: Passwords are cryptographically salted and hashed using `bcryptjs` with high work factors.
- **Sanitized Search Inputs**: All API queries validate inputs against strict Zod schemas to safeguard against injection attacks.

---

## 🚢 Production Deployment

- **Frontend**: Deploy directly to [Vercel](https://vercel.com) or [Cloudflare Pages](https://pages.cloudflare.com). Set `VITE_API_URL` to your production backend.
- **Backend**:
  - **Cloudflare Workers (Edge)**: Run `npm run deploy` via Wrangler for global sub-50ms latency.
  - **Node.js (Render / Railway / Docker)**: Run `npm run build && npm start`.
- **ML Service**: Deploy on [Render](https://render.com), [Railway](https://railway.app), or AWS ECS using the provided `uvicorn` runner.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
