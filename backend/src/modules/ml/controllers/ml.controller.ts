import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import type { Routes } from '#common/types'

export class MlController implements Routes {
  public controller: OpenAPIHono

  constructor() {
    this.controller = new OpenAPIHono()
  }

  public initRoutes() {
    this.controller.openapi(
      createRoute({
        method: 'get',
        path: '/ml/recommendations/{trackId}',
        tags: ['ML'],
        summary: 'Get ML-based track recommendations',
        description: 'Proxy to the FastAPI ML microservice for cosine similarity-based recommendations.',
        operationId: 'getMlRecommendations',
        request: {
          params: z.object({
            trackId: z.string().openapi({
              description: 'Track ID to get recommendations for',
              example: '3IoDK8qI',
            }),
          }),
          query: z.object({
            limit: z.string().pipe(z.coerce.number()).optional().openapi({
              description: 'Number of recommendations',
              example: '10',
              default: '10',
            }),
          }),
        },
        responses: {
          200: {
            description: 'ML recommendations',
            content: {
              'application/json': {
                schema: z.object({
                  success: z.boolean(),
                  data: z.array(z.any()),
                }),
              },
            },
          },
          503: {
            description: 'ML service unavailable',
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
        const { limit } = ctx.req.valid('query')

        const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000'

        try {
          const res = await fetch(`${mlUrl}/recommendations/${trackId}?limit=${limit || 10}`, {
            signal: AbortSignal.timeout(5000),
          })

          if (!res.ok) {
            return ctx.json({ success: false, message: 'ML service returned error' }, 503)
          }

          const data = await res.json()
          return ctx.json({ success: true, data })
        } catch (error) {
          console.error('[ML] Recommendation error:', error)
          return ctx.json({ success: false, message: 'ML service unavailable' }, 503)
        }
      },
    )

    this.controller.openapi(
      createRoute({
        method: 'post',
        path: '/ml/recommend',
        tags: ['ML'],
        summary: 'Get the next track recommendation',
        description:
          'Proxy to the ML microservice for a single next-track recommendation. Returns 503 when the microservice is unavailable so the client can fall back to its local auto-mix scoring.',
        operationId: 'postMlRecommend',
        request: {
          body: {
            content: {
              'application/json': {
                schema: z.object({
                  user_id: z.string().optional(),
                  current_track_id: z.string().optional(),
                  limit: z.number().optional(),
                  client_hour: z.number().optional(),
                }),
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Recommendation payload from the ML service or fallback',
            content: {
              'application/json': {
                schema: z.object({
                  success: z.boolean(),
                  recommendations: z.array(z.any()).optional(),
                  data: z.any().optional(),
                  message: z.string().optional(),
                }),
              },
            },
          },
        },
      }),
      async (ctx) => {
        const body = ctx.req.valid('json')
        const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000'

        try {
          const res = await fetch(`${mlUrl}/api/ml/recommend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: body.user_id || 'guest',
              current_track_id: body.current_track_id,
              limit: body.limit || 1,
              client_hour: body.client_hour,
            }),
            signal: AbortSignal.timeout(5000),
          })

          if (!res.ok) {
            return ctx.json({ success: false, data: null, message: 'ML service returned error' }, 200)
          }

          const data = await res.json()
          return ctx.json({ success: true, data })
        } catch {
          return ctx.json({ success: false, data: null, message: 'ML service unavailable' }, 200)
        }
      },
    )
    this.controller.openapi(
      createRoute({
        method: 'get',
        path: '/ml/features/{trackId}',
        tags: ['ML'],
        summary: 'Get ML audio features for a track',
        description:
          'Proxy to the ML microservice for generative-UI features (tempo, mood, energy). Returns 503 when the microservice is unavailable.',
        operationId: 'getMlFeatures',
        request: {
          params: z.object({
            trackId: z.string().openapi({
              description: 'Track ID to analyse',
              example: '3IoDK8qI',
            }),
          }),
        },
        responses: {
          200: {
            description: 'Feature payload from the ML service or fallback',
            content: {
              'application/json': {
                schema: z.object({
                  success: z.boolean(),
                  features: z.any().optional(),
                  data: z.any().optional(),
                  message: z.string().optional(),
                }),
              },
            },
          },
        },
      }),
      async (ctx) => {
        const { trackId } = ctx.req.valid('param')
        const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000'

        try {
          const res = await fetch(`${mlUrl}/api/ml/features/${encodeURIComponent(trackId)}`, {
            signal: AbortSignal.timeout(5000),
          })

          if (!res.ok) {
            return ctx.json({ success: false, data: null, message: 'ML service returned error' }, 200)
          }

          const data = await res.json()
          return ctx.json({ success: true, data })
        } catch {
          return ctx.json({ success: false, data: null, message: 'ML service unavailable' }, 200)
        }
      },
    )

    this.controller.openapi(
      createRoute({
        method: 'post',
        path: '/ml/update-profile',
        tags: ['ML'],
        summary: 'Update the listener taste profile',
        description:
          'Proxy to the ML microservice so playback events can refresh the taste profile without the browser talking to the microservice directly.',
        operationId: 'postMlUpdateProfile',
        request: {
          body: {
            content: {
              'application/json': {
                schema: z.object({
                  user_id: z.string().optional(),
                  track_id: z.string().optional(),
                  event_type: z.string().optional(),
                }),
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Profile update result or fallback',
            content: {
              'application/json': {
                schema: z.object({
                  success: z.boolean(),
                  data: z.any().optional(),
                  message: z.string().optional(),
                }),
              },
            },
          },
        },
      }),
      async (ctx) => {
        const body = ctx.req.valid('json')
        const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000'

        try {
          const res = await fetch(`${mlUrl}/api/ml/update-profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: body.user_id || 'guest',
              track_id: body.track_id,
              event_type: body.event_type,
            }),
            signal: AbortSignal.timeout(5000),
          })

          if (!res.ok) {
            return ctx.json({ success: false, message: 'ML service returned error' }, 200)
          }

          const data = await res.json()
          return ctx.json({ success: true, data })
        } catch {
          return ctx.json({ success: false, message: 'ML service unavailable' }, 200)
        }
      },
    )
  }
}
