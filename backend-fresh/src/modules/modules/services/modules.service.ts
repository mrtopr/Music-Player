import { Endpoints } from '#common/constants'
import { useFetch } from '#common/helpers'
import { createModulesPayload } from '#modules/modules/helpers'

export class ModulesService {
  async getModules(language: string) {
    const { data } = await useFetch({ endpoint: Endpoints.modules, params: { language } })
    return createModulesPayload(data)
  }

  async getTrending() {
    const { data } = await useFetch({ endpoint: Endpoints.trending, params: {} })
    return data
  }
}
