# Deployment Guide: Vercel (Frontend) + Cloudflare Workers (Backend)

This guide provides instructions to connect the **Mehfil** music player frontend on Vercel with your **Cloudflare Workers** backend.

---

## ⚡ Backend (Cloudflare Workers)
- **Status**: Live on Edge
- **URL**: `https://mehfil-api.krsachin7488.workers.dev`
- **Features**: 0ms cold starts, zero downtime, global CDN caching, 320kbps JioSaavn audio streaming.

---

## 🌐 Frontend Configuration (Vercel)

To link your Vercel frontend with the live Cloudflare Worker:

1. Go to your [Vercel Dashboard](https://vercel.com).
2. Open your `mehfil-music` project → **Settings** → **Environment Variables**.
3. Add / Update the following variable:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://mehfil-api.krsachin7488.workers.dev`
4. Go to **Deployments** → Click **Redeploy** on the latest deployment so Vercel injects the updated environment variable.

---

**दिल से सुनो — Happy Listening! 🎵**
