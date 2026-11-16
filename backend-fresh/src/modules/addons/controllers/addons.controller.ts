import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { AddonsService } from '../services/addons.service'
import type { Routes } from '#common/types'

export class AddonsController implements Routes {
  public controller: OpenAPIHono
  private addonsService: AddonsService

  constructor() {
    this.controller = new OpenAPIHono()
    this.addonsService = new AddonsService()
  }

  public initRoutes() {
    this.controller.openapi(
      createRoute({
        method: 'get',
        path: '/addons/manifest',
        tags: ['Addons'],
        summary: 'Get addon manifest',
        description: 'Return the addon manifest describing available sources and capabilities.',
        operationId: 'getAddonManifest',
        responses: {
          200: {
            description: 'Addon manifest',
            content: {
              'application/json': {
                schema: z.object({
                  success: z.boolean(),
                  data: z.object({
                    id: z.string(),
                    name: z.string(),
                    version: z.string(),
                    description: z.string(),
                    endpoints: z.object({
                      search: z.string(),
                      stream: z.string(),
                    }),
                    capabilities: z.object({
                      lossless: z.boolean(),
                      atmos: z.boolean(),
                    }),
                  }),
                }),
              },
            },
          },
        },
      }),
      async (ctx) => {
        const manifest = await this.addonsService.getManifest()
        return ctx.json({ success: true, data: manifest })
      },
    )

    this.controller.openapi(
      createRoute({
        method: 'get',
        path: '/addons/search',
        tags: ['Addons'],
        summary: 'Search via addon source',
        description: 'Search for tracks using a pluggable addon source (BitChord-compatible).',
        operationId: 'addonSearch',
        request: {
          query: z.object({
            q: z.string().openapi({
              description: 'Search query',
              example: 'Coldplay',
            }),
            source: z.string().optional().openapi({
              description: 'Addon source ID',
              example: 'default',
            }),
          }),
        },
        responses: {
          200: {
            description: 'Search results from addon',
            content: {
              'application/json': {
                schema: z.object({
                  success: z.boolean(),
                  data: z.object({
                    tracks: z.array(z.any()),
                  }),
                }),
              },
            },
          },
        },
      }),
      async (ctx) => {
        const { q, source } = ctx.req.valid('query')
        const results = await this.addonsService.search(q, source)
        return ctx.json({ success: true, data: { tracks: results } })
      },
    )

    this.controller.openapi(
      createRoute({
        method: 'get',
        path: '/addons/stream/{id}',
        tags: ['Addons'],
        summary: 'Resolve stream from addon',
        description: 'Resolve a playable stream URL for a track from an addon source.',
        operationId: 'addonStream',
        request: {
          params: z.object({
            id: z.string().openapi({
              description: 'Track ID from addon',
              example: 'track_8f31',
            }),
          }),
          query: z.object({
            quality: z.string().optional().openapi({
              description: 'Requested quality tier',
              example: 'lossless',
            }),
            atmos: z.string().optional().openapi({
              description: 'Dolby Atmos preference',
              example: 'auto',
            }),
          }),
        },
        responses: {
          200: {
            description: 'Stream URL from addon',
            content: {
              'application/json': {
                schema: z.object({
                  success: z.boolean(),
                  data: z.object({
                    url: z.string(),
                    codec: z.string().optional(),
                    manifest: z.string().optional(),
                    encrypted: z.boolean().optional(),
                    sampleRate: z.number().optional(),
                    bitDepth: z.number().optional(),
                    bitrate: z.number().optional(),
                  }),
                }),
              },
            },
          },
          404: { description: 'Track not found in this addon' },
        },
      }),
      async (ctx) => {
        const { id } = ctx.req.valid('param')
        const { quality, atmos } = ctx.req.valid('query')
        const result = await this.addonsService.resolveStream(id, quality, atmos)

        if (!result) {
          return ctx.json({ success: false, message: 'Track not found in this addon' }, 404)
        }

        return ctx.json({ success: true, data: result })
      },
    )
  }
}
