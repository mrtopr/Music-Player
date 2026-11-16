import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { LyricsProviderModel, LyricsResponseModel } from '#modules/lyrics/models'
import { LyricsService } from '#modules/lyrics/services'
import type { Routes } from '#common/types'

export class LyricsController implements Routes {
  public controller: OpenAPIHono
  private lyricsService: LyricsService

  constructor() {
    this.controller = new OpenAPIHono()
    this.lyricsService = new LyricsService()
  }

  public initRoutes() {
    this.controller.openapi(
      createRoute({
        method: 'get',
        path: '/lyrics',
        tags: ['Lyrics'],
        summary: 'Get lyrics with automatic provider fallback',
        description:
          'Resolves timed or plain lyrics for a track. Providers are tried in order (LRCLIB, Kugou, NetEase, lyrics.ovh) and the best-scoring result is returned, so a failure in one source transparently falls through to the next.',
        operationId: 'getLyrics',
        request: {
          query: z.object({
            title: z.string().openapi({
              description: 'Track title (HTML entities and "From <movie>" suffixes are handled)',
              example: 'Tum Hi Ho',
            }),
            artist: z.string().optional().openapi({
              description: 'Primary artist name',
              example: 'Arijit Singh',
            }),
            album: z.string().optional().openapi({
              description: 'Album / film name',
              example: 'Aashiqui 2',
            }),
            duration: z.string().optional().openapi({
              description: 'Track duration in seconds, used to reject wrong matches',
              example: '261',
            }),
            provider: z.string().optional().openapi({
              description: 'Preferred provider id, or "auto" for the full fallback chain',
              example: 'auto',
            }),
          }),
        },
        responses: {
          200: {
            description: 'Lyrics resolution result',
            content: {
              'application/json': {
                schema: z.object({
                  success: z.boolean(),
                  data: LyricsResponseModel,
                }),
              },
            },
          },
        },
      }),
      async (ctx) => {
        const { title, artist, album, duration, provider } = ctx.req.valid('query')
        const parsedDuration = duration ? Number(duration) : undefined

        const hit = await this.lyricsService.getLyrics(
          {
            title,
            artist,
            album,
            duration: Number.isFinite(parsedDuration) ? parsedDuration : undefined,
          },
          provider,
        )

        const data = {
          found: !!hit,
          provider: hit?.provider ?? null,
          providerName: hit?.providerName ?? null,
          isSynced: !!hit?.syncedLyrics,
          syncedLyrics: hit?.syncedLyrics ?? null,
          plainLyrics: hit?.plainLyrics ?? null,
          instrumental: hit?.instrumental ?? false,
          matchedTitle: hit?.matchedTitle ?? null,
          matchedArtist: hit?.matchedArtist ?? null,
          duration: hit?.duration ?? null,
          triedProviders: this.lyricsService.getProviders().map((p) => p.id),
        }

        return ctx.json({ success: true, data })
      },
    )

    this.controller.openapi(
      createRoute({
        method: 'get',
        path: '/lyrics/providers',
        tags: ['Lyrics'],
        summary: 'List lyrics providers',
        description: 'Lists every provider in the fallback chain and whether it can return synced (timed) lyrics.',
        operationId: 'getLyricsProviders',
        responses: {
          200: {
            description: 'Available lyrics providers',
            content: {
              'application/json': {
                schema: z.object({
                  success: z.boolean(),
                  data: z.array(LyricsProviderModel),
                }),
              },
            },
          },
        },
      }),
      async (ctx) => {
        return ctx.json({ success: true, data: this.lyricsService.getProviders() })
      },
    )
  }
}
