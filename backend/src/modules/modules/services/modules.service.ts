import { GetModulesUseCase, GetTrendingUseCase } from '#modules/modules/use-cases'

export class ModulesService {
  private readonly getModulesUseCase: GetModulesUseCase
  private readonly getTrendingUseCase: GetTrendingUseCase

  constructor() {
    this.getModulesUseCase = new GetModulesUseCase()
    this.getTrendingUseCase = new GetTrendingUseCase()
  }

  getModules = (language: string) => {
    return this.getModulesUseCase.execute(language)
  }

  getTrending = () => {
    return this.getTrendingUseCase.execute()
  }
}
