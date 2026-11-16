import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { extractAllowedUrl } from '#modules/audio/helpers/host.helper'
import { AudioProxyQueryModel } from '#modules/audio/models'
import type { Routes } from '#common/types'

/**
 * Audio proxy — streams music bytes through our own origin.
 *
 * Why this exists:
 *   - Music CDNs do not send CORS headers, so the browser cannot read the
 *     bytes for client-side DSP (BPM / key / waveform analysis).
 *   - Range requests let us analyse just the head or the tail of a track
 *     instead of downloading the whole file.
 */
export class AudioController implements Routes {
  public controller: OpenAPIHono

  constructor() {
    this.controller = new OpenAPIHono()
  }

  public initRoutes() {
    this.controller.openapi(
      createRoute({
        method: 'get',
        path: '/audio/proxy',
        tags: ['Audio'],
        summary: 'Proxy audio bytes (range requests supported)',
        description:
          'Streams an allow-listed music URL through this backend so the browser can analyse it (BPM, key, waveform). Supports HTTP Range requests so only a slice of the track is transferred.',
        operationId: 'proxyAudio',
        request: {
          query: AudioProxyQueryModel,
        },
        responses: {
          200: {
            description: 'Audio stream',
            content: {
              'audio/mpeg': { schema: { type: 'string', format: 'binary' } },
            },
          },
          206: {
            description: 'Partial audio stream',
            content: {
              'audio/mpeg': { schema: { type: 'string', format: 'binary' } },
            },
          },
          400: {
            description: 'Missing or invalid url',
            content: {
              'application/json': {
                schema: z.object({
                  success: z.boolean(),
                  message: z.string(),
                }),
              },
            },
          },
          403: {
            description: 'Host is not allow-listed',
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
        const { url: rawUrl } = ctx.req.valid('query')
        const target = extractAllowedUrl(rawUrl)

        if (!target) {
          return ctx.json({ success: false, message: 'URL host is not allowed' }, 403)
        }

        const range = ctx.req.header('range')
        const headers: Record<string, string> = {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
          Accept: '*/*',
        }
        if (range) headers.Range = range

        try {
          const upstream = await fetch(target.toString(), {
            headers,
            signal: AbortSignal.timeout(20000),
          })

          if (!upstream.ok && upstream.status !== 206) {
            return ctx.json(
              { success: false, message: `Upstream responded with ${upstream.status}` },
              upstream.status === 404 ? 404 : 502,
            )
          }

          const outHeaders: Record<string, string> = {
            'Content-Type': upstream.headers.get('content-type') || 'audio/mpeg',
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*',
          }

          const length = upstream.headers.get('content-length')
          if (length) outHeaders['Content-Length'] = length

          const contentRange = upstream.headers.get('content-range')
          if (contentRange) outHeaders['Content-Range'] = contentRange

          const body = upstream.body
          if (!body) {
            return ctx.json({ success: false, message: 'Empty upstream response' }, 502)
          }

          return new Response(body, {
            status: upstream.status === 206 ? 206 : 200,
            headers: outHeaders,
          })
        } catch (error) {
          console.error('[Audio] Proxy error:', error)
          return ctx.json({ success: false, message: 'Upstream request failed' }, 502)
        }
      },
    )
  }
}
