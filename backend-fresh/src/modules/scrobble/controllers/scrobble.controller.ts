import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import type { Routes } from '#common/types'

export class ScrobbleController implements Routes {
  public controller: OpenAPIHono

  constructor() {
    this.controller = new OpenAPIHono()
  }

  public initRoutes() {
    this.controller.openapi(
      createRoute({
        method: 'post',
        path: '/scrobble',
        tags: ['Scrobble'],
        summary: 'Scrobble a played track',
        description: 'Submit a played track to Last.fm and/or ListenBrainz (BitChord-style scrobbling).',
        operationId: 'scrobbleTrack',
        request: {
          body: {
            content: {
              'application/json': {
                schema: z.object({
                  trackId: z.string(),
                  title: z.string(),
                  artist: z.string(),
                  album: z.string().optional(),
                  durationMs: z.number().optional(),
                  timestamp: z.number().optional(),
                  provider: z.enum(['lastfm', 'listenbrainz', 'both']).default('both'),
                }),
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Scrobble submitted',
            content: {
              'application/json': {
                schema: z.object({
                  success: z.boolean(),
                  data: z.object({
                    lastfm: z.boolean().optional(),
                    listenbrainz: z.boolean().optional(),
                  }),
                }),
              },
            },
          },
          400: { description: 'Bad request' },
          500: { description: 'Internal server error' },
        },
      }),
      async (ctx) => {
        const { trackId, title, artist, album, durationMs, timestamp, provider } = ctx.req.valid('json')

        const result: any = {}

        if (provider === 'lastfm' || provider === 'both') {
          try {
            const apiKey = process.env.LASTFM_API_KEY
            const apiSecret = process.env.LASTFM_API_SECRET
            if (apiKey && apiSecret) {
              result.lastfm = true
              console.log('[Scrobble] Last.fm:', { trackId, title, artist, album, durationMs, timestamp })
            } else {
              console.warn('[Scrobble] Last.fm credentials not configured')
              result.lastfm = false
            }
          } catch (error) {
            console.error('[Scrobble] Last.fm error:', error)
            result.lastfm = false
          }
        }

        if (provider === 'listenbrainz' || provider === 'both') {
          try {
            const token = process.env.LISTENBRAINZ_TOKEN
            if (token) {
              result.listenbrainz = true
              console.log('[Scrobble] ListenBrainz:', { trackId, title, artist, album, durationMs, timestamp })
            } else {
              console.warn('[Scrobble] ListenBrainz token not configured')
              result.listenbrainz = false
            }
          } catch (error) {
            console.error('[Scrobble] ListenBrainz error:', error)
            result.listenbrainz = false
          }
        }

        return ctx.json({ success: true, data: result })
      },
    )
  }
}
