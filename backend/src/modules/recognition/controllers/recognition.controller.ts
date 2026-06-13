import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { z } from 'zod'
import type { Routes } from '#common/types'

export class RecognitionController implements Routes {
  public controller: OpenAPIHono

  constructor() {
    this.controller = new OpenAPIHono()
  }

  public initRoutes() {
    this.controller.openapi(
      createRoute({
        method: 'post',
        path: '/recognize',
        tags: ['Recognition'],
        summary: 'Identify music from audio sample',
        description: 'Upload an audio file to identify the song using the AudD API.',
        operationId: 'recognizeMusic',
        request: {
          body: {
            content: {
              'multipart/form-data': {
                schema: z.object({
                  file: z.instanceof(File).openapi({
                    type: 'string',
                    format: 'binary',
                    description: 'Audio file to identify (MP3, WAV, etc.)'
                  }),
                  api_token: z.string().optional().default('test').openapi({
                    description: 'AudD API token'
                  })
                })
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Successful identification',
            content: {
              'application/json': {
                schema: z.object({
                  status: z.string(),
                  result: z.object({
                    title: z.string(),
                    artist: z.string(),
                    album: z.string(),
                    release_date: z.string().optional(),
                    label: z.string().optional(),
                    timecode: z.string().optional(),
                    song_link: z.string().optional()
                  }).nullable()
                })
              }
            }
          },
          400: { description: 'Bad request' },
          500: { description: 'Internal server error' }
        }
      }),
      async (ctx) => {
        const formData = await ctx.req.formData()
        const file = formData.get('file') as File
        let apiToken = formData.get('api_token') as string
        
        // Use environment variable if provided, or fallback to 'test'
        const envToken = process.env.AUDD_API_TOKEN
        if (!apiToken || apiToken === 'test') {
          apiToken = envToken || 'test'
        }

        if (!file) {
          return ctx.json({ status: 'error', message: 'No file uploaded' }, 400)
        }

        const auddFormData = new FormData()
        auddFormData.append('api_token', apiToken)
        auddFormData.append('file', file)

        try {
          const response = await fetch('https://api.audd.io/', {
            method: 'POST',
            body: auddFormData
          })

          const data = await response.json()
          return ctx.json(data)
        } catch (error) {
          console.error('AudD API error:', error)
          return ctx.json({ status: 'error', message: 'Failed to connect to AudD' }, 500)
        }
      }
    )
  }
}
