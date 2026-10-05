import { serve } from '@hono/node-server'
import { AlbumController, ArtistController, ModulesController, RecognitionController, SearchController, SongController, TelemetryController, AuthController, YouTubeController } from './modules/index'
import { PlaylistController } from './modules/playlists/controllers'
import { App } from './app'

export const app = new App([
  new SearchController(),
  new SongController(),
  new AlbumController(),
  new ArtistController(),
  new PlaylistController(),
  new RecognitionController(),
  new ModulesController(),
  new TelemetryController(),
  new AuthController(),
  new YouTubeController()
]).getApp()

const port = Number(process.env.PORT) || 3000

// Detect Edge / Cloudflare Workers runtime
const isCloudflareWorker = typeof WebSocketPair !== 'undefined' || typeof caches !== 'undefined' && typeof process === 'undefined'
const isNodeRuntime = typeof process !== 'undefined' && process.release?.name === 'node' && !process.env.VERCEL && !isCloudflareWorker

// Start standalone HTTP server only when running in traditional Node.js (Render, Local dev)
if (isNodeRuntime && typeof Bun === 'undefined') {
  try {
    serve({
      fetch: app.fetch,
      port
    }, (info) => {
      console.log(`Server is running on Node.js: http://localhost:${info.port}`)
    })
  } catch (e) {
    // Graceful fallback for non-Node environments
  }
}

// For Cloudflare Workers / Bun / Edge runtimes
export default app
