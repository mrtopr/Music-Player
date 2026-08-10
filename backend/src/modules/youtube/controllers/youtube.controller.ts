import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { YouTubeService } from '../services/youtube.service'
import type { Routes } from '#common/types'

export class YouTubeController implements Routes {
  public controller: OpenAPIHono
  private youtubeService: YouTubeService

  constructor() {
    this.controller = new OpenAPIHono()
    this.youtubeService = new YouTubeService()
  }

  public initRoutes() {
    // ── Search Route ──
    // YouTube songs are now played via embedded iframe — no stream proxy needed
    this.controller.openapi(
      createRoute({
        method: 'get',
        path: '/youtube/search',
        tags: ['YouTube'],
        summary: 'Search YouTube Music',
        description: 'Search songs on YouTube Music and return standardized song objects for iframe playback.',
        request: {
          query: z.object({
            query: z.string().openapi({
              description: 'Search query',
              example: 'Arijit Singh'
            }),
            type: z.string().optional().openapi({
              description: 'Search type: songs | playlists | artists | albums',
              example: 'songs'
            }),
            limit: z.string().optional().openapi({
              description: 'Result limit',
              example: '20'
            })
          })
        },
        responses: {
          200: {
            description: 'Successful YouTube search results',
            content: {
              'application/json': {
                schema: z.object({
                  success: z.boolean(),
                  data: z.object({
                    results: z.array(z.any())
                  })
                })
              }
            }
          }
        }
      }),
      async (ctx) => {
        const { query, type = 'songs', limit } = ctx.req.valid('query')
        const max = limit ? parseInt(limit, 10) : 20
        let results: any[] = []

        if (type === 'playlists') {
          results = await this.youtubeService.searchPlaylists(query, max)
        } else if (type === 'artists') {
          results = await this.youtubeService.searchArtists(query, max)
        } else if (type === 'albums') {
          results = await this.youtubeService.searchAlbums(query, max)
        } else {
          results = await this.youtubeService.searchSongs(query, max)
        }

        return ctx.json({ success: true, data: { results } })
      }
    )
  }
}

