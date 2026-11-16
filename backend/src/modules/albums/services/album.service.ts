import {
  GetAlbumByIdUseCase,
  GetAlbumByLinkUseCase,
  type GetAlbumByIdArgs,
  type GetAlbumByLinkArgs,
} from '#modules/albums/use-cases'

export class AlbumService {
  private readonly getAlbumByIdUseCase: GetAlbumByIdUseCase
  private readonly getAlbumByLinkUseCase: GetAlbumByLinkUseCase

  constructor() {
    this.getAlbumByIdUseCase = new GetAlbumByIdUseCase()
    this.getAlbumByLinkUseCase = new GetAlbumByLinkUseCase()
  }

  getAlbumById = (args: GetAlbumByIdArgs) => {
    return this.getAlbumByIdUseCase.execute(args)
  }

  getAlbumByLink = (args: GetAlbumByLinkArgs) => {
    return this.getAlbumByLinkUseCase.execute(args)
  }
}
