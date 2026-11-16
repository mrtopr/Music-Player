import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import type { Routes } from '#common/types'

export class FavoritesController implements Routes {
  public controller: OpenAPIHono

  constructor() {
    this.controller = new OpenAPIHono()
  }

  public initRoutes() {
    this.controller.openapi(
      createRoute({
        method: 'post',
        path: '/favorites',
        tags: ['Favorites'],
        summary: 'Add a track to favorites',
        description: 'Mark a track as a favorite (liked song).',
        operationId: 'addFavorite',
        request: {
          body: {
            content: {
              'application/json': {
                schema: z.object({
                  userId: z.string().optional(),
                  trackId: z.string(),
                }),
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Added to favorites',
            content: {
              'application/json': {
                schema: z.object({
                  success: z.boolean(),
                  message: z.string(),
                }),
              },
            },
          },
        },
      }),
      async (ctx) => {
        const { userId, trackId } = ctx.req.valid('json')
        return ctx.json({ success: true, message: `Track ${trackId} added to favorites for user ${userId || 'anonymous'}` })
      },
    )

    this.controller.openapi(
      createRoute({
        method: 'get',
        path: '/favorites',
        tags: ['Favorites'],
        summary: 'Get user favorites',
        description: 'List favorite tracks for a user.',
        operationId: 'getFavorites',
        request: {
          query: z.object({
            userId: z.string().optional(),
          }),
        },
        responses: {
          200: {
            description: 'User favorites',
            content: {
              'application/json': {
                schema: z.object({
                  success: z.boolean(),
                  data: z.array(z.any()),
                }),
              },
            },
          },
        },
      }),
      async (ctx) => {
        const { userId } = ctx.req.valid('query')
        return ctx.json({ success: true, data: [] })
      },
    )

    this.controller.openapi(
      createRoute({
        method: 'delete',
        path: '/favorites/{trackId}',
        tags: ['Favorites'],
        summary: 'Remove a track from favorites',
        description: 'Unmark a track as favorite.',
        operationId: 'removeFavorite',
        request: {
          params: z.object({
            trackId: z.string(),
          }),
          query: z.object({
            userId: z.string().optional(),
          }),
        },
        responses: {
          200: {
            description: 'Removed from favorites',
            content: {
              'application/json': {
                schema: z.object({
                  success: z.boolean(),
                  message: z.string(),
                }),
              },
            },
          },
        },
      }),
      async (ctx) => {
        const { trackId } = ctx.req.valid('param')
        const { userId } = ctx.req.valid('query')
        return ctx.json({ success: true, message: `Track ${trackId} removed from favorites for user ${userId || 'anonymous'}` })
      },
    )
  }
}
