import { OpenAPIHono } from '@hono/zod-openapi'
import { apiReference } from '@scalar/hono-api-reference'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { Home } from './pages/home'
import type { Routes } from '#common/types'
import type { HTTPException } from 'hono/http-exception'

export class App {
  private app: OpenAPIHono

  constructor(routes: Routes[]) {
    this.app = new OpenAPIHono()

    this.initializeGlobalMiddlewares()
    this.initializeRoutes(routes)
    this.initializeSwaggerUI()
    this.initializeRouteFallback()
    this.initializeErrorHandler()
  }

  private initializeRoutes(routes: Routes[]) {
    routes.forEach((route) => {
      route.initRoutes()
      this.app.route('/api', route.controller)
    })

    this.app.route('/', Home)
  }

  private initializeGlobalMiddlewares() {
    this.app.use('*', async (c, next) => {
      if (c.env && typeof process !== 'undefined' && process.env) {
        for (const [k, v] of Object.entries(c.env)) {
          if (typeof v === 'string' && !process.env[k]) {
            process.env[k] = v
          }
        }
      }
      await next()
    })
    this.app.use(logger())
    this.app.use(prettyJSON())
    const allowedOrigins = new Set([
      ...(process.env.FRONTEND_URL || '').split(',').map((o) => o.trim()).filter(Boolean),
      'http://localhost:5173',
      'http://localhost:3000',
    ])
    this.app.use(cors({
      origin: (origin) => {
        if (!origin || allowedOrigins.has(origin)) {
          return origin || '*'
        }
        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return origin
        }
        return null
      },
      allowHeaders: ['Content-Type', 'Authorization'],
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
    }))
  }

  private initializeSwaggerUI() {
    this.app.doc31('/swagger', (c) => {
      const { protocol: urlProtocol, hostname, port } = new URL(c.req.url)
      const protocol = c.req.header('x-forwarded-proto')
        ? `${c.req.header('x-forwarded-proto')}:`
        : urlProtocol

      return {
        openapi: '3.1.0',
        info: {
          version: '1.0.0',
          title: 'Mehfil Backend (Fresh)',
          description: '# Mehfil Music Backend\n\nFreshly rebuilt backend with JioSaavn integration and BitChord-inspired features.',
        },
        servers: [{ url: `${protocol}//${hostname}${port ? `:${port}` : ''}`, description: 'Current environment' }],
      }
    })

    this.app.get(
      '/docs',
      apiReference({
        pageTitle: 'Mehfil API Documentation',
        theme: 'deepSpace',
        isEditable: false,
        layout: 'modern',
        darkMode: true,
        metaData: {
          applicationName: 'Mehfil API',
          author: 'Sachin (@mrtopr)',
          creator: 'Sachin (@mrtopr)',
          publisher: 'Mehfil',
          robots: 'index, follow',
          description: 'Mehfil music streaming backend API crafted by Sachin.',
        },
        url: '/swagger',
      })
    )
  }

  private initializeRouteFallback() {
    this.app.notFound((ctx) => {
      return ctx.json({ success: false, message: 'route not found, check docs at /docs' }, 404)
    })
  }

  private initializeErrorHandler() {
    this.app.onError((err, ctx) => {
      const error = err as HTTPException
      return ctx.json({ success: false, message: error.message }, error.status || 500)
    })
  }

  public getApp() {
    return this.app
  }
}
