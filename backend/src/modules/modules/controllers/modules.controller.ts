import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { ModulesModel, TrendingModel } from '#modules/modules/models/modules.model'
import { ModulesService } from '#modules/modules/services/modules.service'
import type { Routes } from '#common/types'

export class ModulesController implements Routes {
  public controller: OpenAPIHono
  private modulesService: ModulesService

  constructor() {
    this.controller = new OpenAPIHono()
    this.modulesService = new ModulesService()
  }

  public initRoutes() {
    this.controller.openapi(
      createRoute({
        method: 'get',
        path: '/modules',
        tags: ['Modules'],
        summary: 'Retrieve browse modules',
        description: 'Retrieve browse modules such as new releases, charts, and trending content.',
        operationId: 'getBrowseModules',
        request: {
          query: z.object({
            language: z.string().optional().openapi({
              title: 'Language',
              description: 'Comma-separated list of languages',
              type: 'string',
              example: 'hindi,english',
              default: 'hindi,english'
            })
          })
        },
        responses: {
          200: {
            description: 'Successful response with browse modules',
            content: {
              'application/json': {
                schema: z.object({
                  success: z.boolean(),
                  data: ModulesModel
                })
              }
            }
          }
        }
      }),
      async (ctx) => {
        const { language } = ctx.req.valid('query')
        const response = await this.modulesService.getModules(language || 'hindi,english')
        return ctx.json({ success: true, data: response })
      }
    )

    this.controller.openapi(
      createRoute({
        method: 'get',
        path: '/trending',
        tags: ['Modules'],
        summary: 'Retrieve trending content',
        description: 'Retrieve trending songs and albums.',
        operationId: 'getTrending',
        responses: {
          200: {
            description: 'Successful response with trending content',
            content: {
              'application/json': {
                schema: z.object({
                  success: z.boolean(),
                  data: TrendingModel
                })
              }
            }
          }
        }
      }),
      async (ctx) => {
        const response = await this.modulesService.getTrending()
        return ctx.json({ success: true, data: response })
      }
    )
  }
}
