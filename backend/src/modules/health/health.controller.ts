import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { prisma } from '#common/prisma'
import type { Routes } from '#common/types'

export class HealthController implements Routes {
  public controller: OpenAPIHono

  constructor() {
    this.controller = new OpenAPIHono()
  }

  public initRoutes() {
    this.controller.openapi(
      createRoute({
        method: 'get',
        path: '/health',
        tags: ['System'],
        summary: 'Health check & DB keep-alive',
        description: 'Pings PostgreSQL with SELECT 1 to keep serverless database and backend connections warm.',
        responses: {
          200: {
            description: 'Service and database are healthy',
            content: {
              'application/json': {
                schema: z.object({
                  ok: z.boolean(),
                  db: z.string(),
                  latencyMs: z.number(),
                  uptimeSeconds: z.number(),
                  timestamp: z.string(),
                }),
              },
            },
          },
          503: {
            description: 'Database unreachable',
            content: {
              'application/json': {
                schema: z.object({
                  ok: z.boolean(),
                  db: z.string(),
                  latencyMs: z.number(),
                  message: z.string().optional(),
                  timestamp: z.string(),
                }),
              },
            },
          },
        },
      }),
      async (ctx) => {
        const started = Date.now()
        const uptimeSeconds = typeof process !== 'undefined' && typeof process.uptime === 'function'
          ? Math.round(process.uptime())
          : 0

        try {
          await prisma.$queryRaw`SELECT 1`
          return ctx.json({
            ok: true,
            db: 'connected',
            latencyMs: Date.now() - started,
            uptimeSeconds,
            timestamp: new Date().toISOString(),
          }, 200)
        } catch (err: any) {
          // Attempt one reconnect if the idle pooler closed the socket
          try {
            await prisma.$connect()
            await prisma.$queryRaw`SELECT 1`
            return ctx.json({
              ok: true,
              db: 'reconnected',
              latencyMs: Date.now() - started,
              uptimeSeconds,
              timestamp: new Date().toISOString(),
            }, 200)
          } catch (retryErr: any) {
            return ctx.json({
              ok: false,
              db: 'error',
              latencyMs: Date.now() - started,
              message: retryErr?.message || err?.message || 'Database ping failed',
              timestamp: new Date().toISOString(),
            }, 503)
          }
        }
      }
    )
  }
}
