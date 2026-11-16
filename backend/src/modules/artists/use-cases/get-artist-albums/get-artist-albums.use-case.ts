import { Endpoints } from '#common/constants'
import { useFetch } from '#common/helpers'
import { createAlbumPayload } from '#modules/albums/helpers'
import type { IUseCase } from '#common/types'
import type { ArtistAlbumModel } from '#modules/artists/models'
import type { z } from 'zod'

export interface GetArtistAlbumsArgs {
  artistId: string
  page: number
  sortBy: string
  sortOrder: string
}

export class GetArtistAlbumsUseCase implements IUseCase<GetArtistAlbumsArgs, z.infer<typeof ArtistAlbumModel>> {
  constructor() {}

  async execute({ artistId, page, sortBy, sortOrder }: GetArtistAlbumsArgs) {
    const { data } = await useFetch<any>({
      endpoint: Endpoints.artists.albums,
      params: {
        artistId,
        page,
        sortBy,
        sortOrder,
      },
    })

    // JioSaavn answers `artist.getArtistMoreAlbum` with
    //   { topAlbums: { albums: [...], total, last_page } }
    // and used to answer with a flat { total, start, results } envelope.
    const rawAlbums: any[] = data?.topAlbums?.albums ?? data?.results ?? []
    const albums = rawAlbums.map(createAlbumPayload)

    return {
      total: Number(data?.topAlbums?.total ?? data?.total ?? albums.length),
      start: Number(data?.topAlbums?.start ?? data?.start ?? 0),
      results: albums,
      // The list views read `albums`; `results` is kept for compatibility.
      albums,
    }
  }
}
