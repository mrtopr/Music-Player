import { serve } from '@hono/node-server'
import {
  SearchController,
  SongController,
  AlbumController,
  ArtistController,
  PlaylistController,
  TelemetryController,
  RecognitionController,
  YouTubeController,
  ModulesController,
  AddonsController,
  ScrobbleController,
  FavoritesController,
  MlController,
  LyricsController,
  AudioController,
} from './modules/index'
import { App } from './app'

export const app = new App([
  new SearchController(),
  new SongController(),
  new AlbumController(),
  new ArtistController(),
  new PlaylistController(),
  new TelemetryController(),
  new RecognitionController(),
  new YouTubeController(),
  new ModulesController(),
  new AddonsController(),
  new ScrobbleController(),
  new FavoritesController(),
  new MlController(),
  new LyricsController(),
  new AudioController(),
]).getApp()

const port = Number(process.env.PORT) || 3001

// Detect Edge / Cloudflare Workers runtime
const isCloudflareWorker =
  typeof (globalThis as any).WebSocketPair !== 'undefined' ||
  (typeof caches !== 'undefined' && typeof process === 'undefined')
const isNodeRuntime =
  typeof process !== 'undefined' && process.release?.name === 'node' && !process.env.VERCEL && !isCloudflareWorker

// Start standalone HTTP server only when running in traditional Node.js (local dev, Render, Railway)
if (isNodeRuntime && typeof Bun === 'undefined') {
  try {
    serve(
      {
        fetch: app.fetch,
        port,
      },
      (info) => {
        console.log(`Server is running on Node.js: http://localhost:${info.port}`)
      },
    )
  } catch (e) {
    // Graceful fallback for non-Node environments
  }
}

// For Cloudflare Workers / Bun / Edge runtimes
export default app
