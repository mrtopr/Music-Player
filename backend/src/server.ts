import { serve } from '@hono/node-server'
import { AlbumController, ArtistController, ModulesController, RecognitionController, SearchController, SongController, TelemetryController, AuthController, YouTubeController } from '#modules/index'
import { PlaylistController } from '#modules/playlists/controllers'
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

// For Node.js (Render, local dev, etc.)
if (typeof Bun === 'undefined' && !process.env.VERCEL) {
    serve({
        fetch: app.fetch,
        port
    }, (info) => {
        console.log(`Server is running on Node.js: http://localhost:${info.port}`)
    })
}

// For Bun / Cloudflare Workers
export default {
  port,
  fetch: app.fetch
}
