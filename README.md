# Mehfil – दिल से सुनो 🎵

Mehfil is a premium, AI-powered music streaming ecosystem designed for a seamless Bollywood music experience. It features a modern, glassmorphic web frontend, a robust Hono-based Node.js API, and a dedicated Python Machine Learning service that powers intelligent recommendations and dynamic auto-queuing.

---

## 🚀 Key Features

- **High-Quality Streaming**: Access to a vast library of songs, albums, and playlists with high-fidelity audio via the JioSaavn API.
- **AI Auto-Queue & Recommendations**: A dedicated Machine Learning service that analyzes audio features (BPM, Energy, Valence) and user telemetry to intelligently predict and queue the next best track using Cosine Similarity.
- **Dynamic User Taste Profiles**: The system actively learns what you like. Completing a song pulls your taste profile closer to its features, while skipping pushes it away.
- **Secure Authentication**: Full JWT-based authentication system backed by PostgreSQL and Prisma ORM.
- **Premium Dynamic UI**: A modern, responsive Glassmorphism-inspired interface with dynamic backgrounds that adapt to the currently playing song's album art in real-time.
- **Advanced Queue Management**: Full control over playback with support for playlists, shuffling, and repeat modes.
- **Music Recognition**: Integrated Shazam-like audio fingerprinting to identify tracks on the fly.

---

## 🛠️ Tech Stack Analysis

### **Frontend (Web Application)**
A modern, reactive single-page application built with performance and aesthetics in mind.
- **Framework**: [React 19](https://react.dev/) with [Vite](https://vitejs.dev/)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/) (Fast, scalable, and boilerplate-free)
- **Styling**: Vanilla CSS with deep Glassmorphism, CSS Variables, and custom micro-animations
- **Color Extraction**: [Node-Vibrant](https://github.com/vibrant/node-vibrant) for real-time dominant color extraction from album art
- **Icons & Routing**: [Lucide React](https://lucide.dev/) and [React Router DOM](https://reactrouter.com/)

### **Backend (Core Node API)**
A high-performance API wrapper and authentication server.
- **Framework**: [Hono](https://hono.dev/) (Ultra-fast Edge web framework)
- **Database & ORM**: PostgreSQL paired with [Prisma](https://www.prisma.io/)
- **Security**: JWT Authentication and bcrypt password hashing
- **Validation**: [Zod](https://zod.dev/) for strict type-safe OpenAPI schemas
- **Documentation**: [Scalar](https://scalar.com/) for interactive API reference
- **Modules**: Authentication, Telemetry, Songs, Albums, Search, Playlists, and Audio Recognition

### **ML-Service (AI Recommendations)**
A lightweight, fast Python microservice for data-science operations.
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) with Uvicorn
- **Machine Learning**: [Scikit-Learn](https://scikit-learn.org/) and [NumPy](https://numpy.org/)
- **Algorithms**: Vector Embeddings, Cosine Similarity, and Telemetry-driven Learning Rates
- **Context-Aware**: Adjusts music recommendations dynamically based on the user's local time (e.g., lower BPM at night).

---

## 📁 Project Structure

```text
.
├── backend/            # Hono-based Node.js API Service
│   ├── prisma/         # PostgreSQL Database Schema
│   ├── src/
│   │   ├── modules/    # Auth, Telemetry, JioSaavn integrations, etc.
│   │   └── server.ts   # Entry point
│   └── package.json    # Backend Dependencies
├── frontend/           # React 19 Web Application
│   ├── src/
│   │   ├── components/ # Reusable UI components & Layouts
│   │   ├── pages/      # Route-level components (Home, Auth, Settings)
│   │   ├── store/      # Zustand state managers (Auth, Player)
│   │   └── styles/     # CSS modules and global UI styles
│   └── vite.config.js  # Vite Configuration
├── ml-service/         # Python FastAPI Machine Learning Service
│   ├── main.py         # Recommendation Engine & Telemetry processing
│   ├── seed_data.py    # Database seeding tools
│   └── requirements.txt# Python Dependencies
└── README.md           # Project documentation
```

---

## 🛠️ Getting Started

### 1. Database & Backend Setup
Navigate to the backend directory and set up your PostgreSQL environment:
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev
```

### 2. Machine Learning Service Setup
Navigate to the ML service directory and start the FastAPI server:
```bash
cd ml-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend Setup
Navigate to the frontend directory and launch the Vite dev server:
```bash
cd frontend
npm install
npm run dev
```

---

## 📜 License
This project is licensed under the MIT License.
