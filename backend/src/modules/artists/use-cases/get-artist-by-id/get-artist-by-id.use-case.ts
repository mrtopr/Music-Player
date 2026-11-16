import { Endpoints } from '#common/constants'
import { useFetch } from '#common/helpers'
import { createArtistPayload } from '#modules/artists/helpers'
import { HTTPException } from 'hono/http-exception'
import type { IUseCase } from '#common/types'
import type { ArtistAPIResponseModel, ArtistModel } from '#modules/artists/models'
import type { z } from 'zod'

export interface GetArtistByIdArgs {
  artistId: string
  page: number
  songCount: number
  albumCount: number
  sortBy: string
  sortOrder: string
}

export class GetArtistByIdUseCase implements IUseCase<GetArtistByIdArgs, z.infer<typeof ArtistModel>> {
  constructor() {}

  async execute({ artistId, page, songCount, albumCount, sortBy, sortOrder }: GetArtistByIdArgs) {
    const { data } = await useFetch<z.infer<typeof ArtistAPIResponseModel>>({
      endpoint: Endpoints.artists.id,
      params: {
        artistId,
        page,
        songCount,
        albumCount,
        sortBy,
        sortOrder,
      },
    })

    if (!data) throw new HTTPException(404, { message: 'artist not found' })

    return createArtistPayload(data)
  }
}
