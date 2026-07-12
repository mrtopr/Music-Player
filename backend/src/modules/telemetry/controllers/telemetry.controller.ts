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
                  userId: z.string().uuid(),
                  trackId: z.string(),
                  title: z.string().optional(),
                  artist: z.string().optional(),
                  genre: z.string().optional(),
                  durationMs: z.number().optional(),
                  sessionId: z.string().uuid(),
                  eventType: z.enum(['play_started', 'play_completed', 'skipped', 'repeated']),
                  contextSource: z.string().optional(),
                  contextPlaylistId: z.string().optional(),
                  durationListenedMs: z.number().optional()
                })
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: z.object({
                  success: z.boolean(),
                  data: z.any()
                })
              }
            }
          }
        }
      }),
      async (ctx) => {
        const { userId, trackId, title, artist, genre, durationMs, sessionId, eventType, contextSource, contextPlaylistId, durationListenedMs } = ctx.req.valid('json')
        
        try {
          // Ensure user exists
          const user = await prisma.user.upsert({
            where: { id: userId },
            update: {},
            create: { id: userId }
          })
          
          // 1. Check if track exists, if not, create it using provided metadata
          let track = await prisma.track.findUnique({ where: { id: trackId } })
          
          if (!track) {
            track = await prisma.track.create({
              data: {
                id: trackId,
                title: title || 'Unknown Track',
                artist: artist || 'Unknown Artist',
                genre: genre || 'Unknown',
                durationMs: durationMs || 180000
              }
            })
          } else if ((track.artist === 'Unknown Artist' || track.title === 'Unknown Track') && (title || artist)) {
             // Update track if it was previously created without metadata
             track = await prisma.track.update({
                where: { id: trackId },
                data: {
                   title: title || track.title,
                   artist: artist || track.artist,
                   genre: genre || track.genre,
                   durationMs: durationMs || track.durationMs
                }
             })
          }
          
          const event = await prisma.playbackEvent.create({
            data: {
              userId: user.id,
              trackId: track.id,
              sessionId: sessionId,
              eventType: eventType,
              contextSource: contextSource,
              contextPlaylistId: contextPlaylistId,
              durationListenedMs: durationListenedMs
            }
          })
          
          return ctx.json({ success: true, data: event })
        } catch (error) {
          console.error(error)
          return ctx.json({ success: false, data: null }, 500)
        }
      }
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
            userId: z.string().uuid()
          })
        },
        responses: {
          200: {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: z.object({
                  success: z.boolean(),
                  data: z.any()
                })
              }
            }
          }
        }
      }),
      async (ctx) => {
        const { userId } = ctx.req.valid('query')
        
        try {
          const events = await prisma.playbackEvent.findMany({
            where: { userId },
            include: { track: true }
          })
          
          let totalDurationMs = 0
          const artistScores: Record<string, number> = {}
          const genreScores: Record<string, number> = {}
          
          for (const ev of events) {
            // Aggregate total listening time
            if (ev.durationListenedMs) {
              totalDurationMs += ev.durationListenedMs
            } else if (ev.eventType === 'play_completed' && ev.track.durationMs) {
              totalDurationMs += ev.track.durationMs
            }
            
            let score = 0
            if (ev.eventType === 'play_completed') score = 2
            if (ev.eventType === 'repeated') score = 3
            // Treat skipped songs as a slight negative, but give credit for playing it if listened for > 30s
            if (ev.eventType === 'skipped') {
               score = (ev.durationListenedMs && ev.durationListenedMs > 30000) ? 1 : -1
            }
            if (ev.eventType === 'play_started') {
               // Give a tiny baseline score so they show up if you only play and pause
               score = 0.5 
            }
            
            if (score > 0) {
              if (ev.track.artist) {
                const artists = ev.track.artist.split(',').map(a => a.trim())
                artists.forEach(a => {
                  if (a) artistScores[a] = (artistScores[a] || 0) + score
                })
              }
              if (ev.track.genre) {
                const genres = ev.track.genre.split(',').map(g => g.trim())
                genres.forEach(g => {
                  if (g) genreScores[g] = (genreScores[g] || 0) + score
                })
              }
            }
          }
          
          // Sort and slice top items
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
              topGenres
            }
          })
        } catch (error) {
          console.error(error)
          return ctx.json({ success: false, data: null }, 500)
        }
      }
    )
  }
}
