import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { prisma } from '../../../common/prisma'

export class TelemetryController {
  public controller: OpenAPIHono

  constructor() {
    this.controller = new OpenAPIHono()
  }

  public initRoutes() {
    this.controller.openapi(
      createRoute({
        method: 'post',
        path: '/telemetry/events',
        tags: ['Telemetry'],
        summary: 'Log a playback event',
        description: 'Log an event when a user plays, skips, or completes a track.',
        request: {
          body: {
            content: {
              'application/json': {
                schema: z.object({
                  userId: z.string().optional(),
                  trackId: z.string(),
                  title: z.string().optional(),
                  artist: z.string().optional(),
                  genre: z.string().optional(),
                  durationMs: z.number().optional(),
                  sessionId: z.string().optional(),
                  eventType: z.enum(['play_started', 'play_completed', 'skipped', 'repeated']),
                  contextSource: z.string().optional(),
                  contextPlaylistId: z.string().optional(),
                  durationListenedMs: z.number().optional(),
                }),
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: z.object({
                  success: z.boolean(),
                  data: z.any(),
                }),
              },
            },
          },
          500: {
            description: 'Error response',
            content: {
              'application/json': {
                schema: z.object({
                  success: z.boolean(),
                  data: z.any(),
                }),
              },
            },
          },
          404: {
            description: 'Not found',
            content: {
              'application/json': {
                schema: z.object({
                  success: z.boolean(),
                  data: z.any(),
                }),
              },
            },
          },
        },
      }),
      async (ctx) => {
        const { userId, trackId, title, artist, genre, durationMs, sessionId, eventType, contextSource, contextPlaylistId, durationListenedMs } = ctx.req.valid('json')

        try {
          const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null

          if (userId && !user) {
            return ctx.json({ success: false, data: 'User not found' }, 404)
          }

          let track = await prisma.track.findUnique({ where: { id: trackId } })

          if (!track) {
            track = await prisma.track.create({
              data: {
                id: trackId,
                name: title || 'Unknown Track',
                artist: artist || 'Unknown Artist',
                genre: genre || 'Unknown',
                durationMs: durationMs || 180000,
              },
            })
          } else if ((track.artist === 'Unknown Artist' || track.name === 'Unknown Track') && (title || artist)) {
            track = await prisma.track.update({
              where: { id: trackId },
              data: {
                name: title || track.name,
                artist: artist || track.artist,
                genre: genre || track.genre,
                durationMs: durationMs || track.durationMs,
              },
            })
          }

          const event = await prisma.playbackEvent.create({
            data: {
              userId: userId || 'anonymous',
              trackId: track.id,
              sessionId: sessionId || '',
              eventType,
              contextSource,
              contextPlaylistId,
              durationListenedMs,
            },
          })

          return ctx.json({ success: true, data: event })
        } catch (error) {
          console.error(error)
          return ctx.json({ success: false, data: null }, 500)
        }
      },
    )

    this.controller.openapi(
      createRoute({
        method: 'get',
        path: '/telemetry/stats',
        tags: ['Telemetry'],
        summary: 'Get user listening stats',
        description: 'Retrieve aggregated stats like total time, top artists, and top genres.',
        request: {
          query: z.object({
            userId: z.string().optional(),
          }),
        },
        responses: {
          200: {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: z.object({
                  success: z.boolean(),
                  data: z.any(),
                }),
              },
            },
          },
          500: {
            description: 'Error response',
            content: {
              'application/json': {
                schema: z.object({
                  success: z.boolean(),
                  data: z.any(),
                }),
              },
            },
          },
        },
      }),
      async (ctx) => {
        const { userId } = ctx.req.valid('query')

        try {
          const events = await prisma.playbackEvent.findMany({
            where: userId ? { userId } : {},
            include: { track: true },
          })

          let totalDurationMs = 0
          const artistScores: Record<string, number> = {}
          const genreScores: Record<string, number> = {}

          for (const ev of events) {
            if (ev.durationListenedMs) {
              totalDurationMs += ev.durationListenedMs
            } else if (ev.eventType === 'play_completed' && ev.track.durationMs) {
              totalDurationMs += ev.track.durationMs
            }

            let score = 0
            if (ev.eventType === 'play_completed') score = 2
            if (ev.eventType === 'repeated') score = 3
            if (ev.eventType === 'skipped') {
              score = ev.durationListenedMs && ev.durationListenedMs > 30000 ? 1 : -1
            }
            if (ev.eventType === 'play_started') {
              score = 0.5
            }

            if (score > 0) {
              if (ev.track.artist) {
                const artists = ev.track.artist.split(',').map((a) => a.trim())
                artists.forEach((a) => {
                  if (a) artistScores[a] = (artistScores[a] || 0) + score
                })
              }
              if (ev.track.genre) {
                const genres = ev.track.genre.split(',').map((g) => g.trim())
                genres.forEach((g) => {
                  if (g) genreScores[g] = (genreScores[g] || 0) + score
                })
              }
            }
          }

          const topArtists = Object.entries(artistScores)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, score]) => ({ name, score }))

          const topGenres = Object.entries(genreScores)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, score]) => ({ name, score }))

          return ctx.json({
            success: true,
            data: {
              totalListeningTimeMinutes: Math.round(totalDurationMs / 60000),
              topArtists,
              topGenres,
            },
          })
        } catch (error) {
          console.error(error)
          return ctx.json({ success: false, data: null }, 500)
        }
      },
    )
  }
}
