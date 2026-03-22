# Deployment Guide: Vercel (Frontend) + Render (Backend)

This guide provides step-by-step instructions to deploy the **Mehfil** music player using **Vercel** for the frontend and **Render** for the backend (JioSaavn API).

## 🚀 Part 1: Backend Deployment (Render)

1. **GitHub Repository**: Push your code to a GitHub repository (including the `jiosaavn-api/` directory).
2. **Setup on Render**:
   - Go to [dashboard.render.com](https://dashboard.render.com).
   - Click **New +** and select **Web Service**.
   - Connect your repository.
   - **Name**: `mehfil-api`
   - **Language**: **Node** (since the Bun option might be hidden behind a setting or not available)
   - **Root Directory**: `jiosaavn-api`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node dist/server.js`
   - **Plan**: Free (or any tier).
3. **Wait for Deployment**: Once deployed, copy the Render URL (e.g., `https://mehfil-api.onrender.com`).

## 🌐 Part 2: Frontend Deployment (Vercel)

1. **GitHub Repository**: Ensure the root project (Vite app) is in your repository.
2. **Setup on Vercel**:
   - Go to [vercel.com](https://vercel.com).
   - Click **Add New** and select **Project**.
   - Import your repository.
   - **Framework Preset**: Vite (should be auto-detected).
   - **Root Directory**: `./` (Keep it as root).
   - **Build Settings**:
     - Build Command: `npm run build`
     - Output Directory: `dist`
   - **Environment Variables**:
     - Key: `VITE_API_BASE_URL`
     - Value: `https://mehfil-api.onrender.com` (The one you copied from Render).
3. **Deploy**: Click **Deploy**. Vercel will build and host your music player.

## ⚙️ Maintenance & Troubleshooting

- **CORS**: The backend is already configured to allow CORS, so Vercel can talk to Render without issues.
- **Cold Starts**: Render's free tier services spin down after inactivity. The first request may take ~30 seconds to wake the backend up.
- **Cache**: Clear your browser cache if the environment variables don't seem to apply immediately after deployment.

---
**दिल से सुनो — Happy Listening!**
