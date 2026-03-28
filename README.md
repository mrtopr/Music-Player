# Mehfil – दिल से सुनो 🎵

Mehfil is a premium, high-performance music streaming ecosystem designed for a seamless Bollywood music experience. It features a modern web frontend and a robust, scalable backend API.

---

## 🚀 Key Features

- **High-Quality Streaming**: Access to a vast library of songs, albums, and playlists with high-fidelity audio.
- **Music Recognition**: Integrated Shazam-like music recognition to identify tracks on the fly.
- **Dynamic UI**: A premium Glassmorphism-inspired interface with dynamic backgrounds that adapt to the currently playing song's album art.
- **Queue Management**: Advanced queue handling with support for playlists, shuffling, and repeat modes.
- **Sleep Timer**: Built-in sleep timer for a better night-time listening experience.
- **Responsive Design**: Fully optimized for Desktop and Mobile browsers.

---

## 🛠️ Tech Stack Analysis

### **Frontend (Web)**
A modern, reactive single-page application built with performance and aesthetics in mind.
- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/) (Fast, scalable, and boilerplate-free).
- **Styling**: Vanilla CSS with a focus on Glassmorphism, CSS Variables, and custom animations.
- **Icons**: [Lucide React](https://lucide.dev/)
- **Color Extraction**: [Node-Vibrant](https://github.com/vibrant/node-vibrant) for real-time extraction of dominant colors from album art.
- **Routing**: [React Router DOM](https://reactrouter.com/)

### **Backend (API)**
A high-performance, unofficial JioSaavn API wrapper.
- **Framework**: [Hono](https://hono.dev/) (The ultra-fast web framework for the Edge).
- **Runtime**: [Bun](https://bun.sh/) or [Node.js](https://nodejs.org/).
- **Validation**: [Zod](https://zod.dev/) for type-safe schema validation.
- **Documentation**: [Scalar](https://scalar.com/) for interactive API reference.
- **Deployment**: Optimized for [Cloudflare Workers](https://workers.cloudflare.com/) and [Vercel](https://vercel.com/).
- **Modules**:
  - `Songs`: Fetch track details and streaming links.
  - `Albums`: Detailed album metadata and tracklists.
  - `Search`: Global search across songs, albums, artists, and playlists.
  - `Artists`: Comprehensive artist profiles and discography.
  - `Recognition`: Advanced audio fingerprinting for music identification.

---

## 📁 Project Structure

```text
.
├── backend/            # Hono-based API service
│   ├── src/
│   │   ├── modules/    # Functional modules (songs, search, recognition, etc.)
│   │   ├── common/     # Shared utilities and types
│   │   └── server.ts   # Entry point
│   └── tsconfig.json   # TypeScript configuration
├── frontend/           # React 19 web application
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── store/      # Zustand state management
│   │   ├── pages/      # Route-level components
│   │   └── styles/     # CSS modules and global styles
│   └── vite.config.js  # Vite configuration
└── README.md           # Project documentation
```

---

## 🛠️ Getting Started

### Backend Setup
1. Navigate to the backend directory: `cd backend`
2. Install dependencies: `bun install` (or `npm install`)
3. Run in development: `bun run dev`

### Frontend Setup
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`

---

## 📜 License
This project is licensed under the MIT License.
