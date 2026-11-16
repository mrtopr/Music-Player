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
              example: 'Arijit Singh',
            }),
            type: z.string().optional().openapi({
              description: 'Search type: songs | playlists | artists | albums',
              example: 'songs',
            }),
            limit: z.string().optional().openapi({
              description: 'Result limit',
              example: '20',
            }),
          }),
        },
        responses: {
          200: {
            description: 'Successful YouTube search results',
            content: {
              'application/json': {
                schema: z.object({
                  success: z.boolean(),
                  data: z.object({
                    results: z.array(z.any()),
                  }),
                }),
              },
            },
          },
        },
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
      },
    )

    this.controller.openapi(
      createRoute({
        method: 'get',
        path: '/youtube/stream',
        tags: ['YouTube'],
        summary: 'Resolve YouTube stream URL',
        description: 'Resolve a playable audio stream URL for a YouTube video ID using multi-tier fallback.',
        request: {
          query: z.object({
            v: z.string().openapi({
              description: 'YouTube video ID',
              example: 'dQw4w9WgXcQ',
            }),
          }),
        },
        responses: {
          200: {
            description: 'Stream URL resolved',
            content: {
              'application/json': {
                schema: z.object({
                  success: z.boolean(),
                  data: z.object({
                    videoId: z.string(),
                    streamUrl: z.string().nullable(),
                    source: z.string(),
                  }),
                }),
              },
            },
          },
          404: { description: 'No stream URL could be resolved' },
        },
      }),
      async (ctx) => {
        const { v } = ctx.req.valid('query')
        const streamUrl = await this.youtubeService.getStreamUrl(v)

        if (!streamUrl) {
          return ctx.json({ success: false, data: { videoId: v, streamUrl: null, source: null } }, 404)
        }

        return ctx.json({ success: true, data: { videoId: v, streamUrl, source: 'resolved' } })
      },
    )
  }
}
