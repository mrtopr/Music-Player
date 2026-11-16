import { Endpoints } from '#common/constants'
import { useFetch } from '#common/helpers'
import { createSongPayload } from '#modules/songs/helpers'
import type { IUseCase } from '#common/types'
import type { ArtistSongModel } from '#modules/artists/models'
import type { z } from 'zod'

export interface GetArtistSongsArgs {
  artistId: string
  page: number
  sortBy: string
  sortOrder: string
}

export class GetArtistSongsUseCase implements IUseCase<GetArtistSongsArgs, z.infer<typeof ArtistSongModel>> {
  constructor() {}

  async execute({ artistId, page, sortBy, sortOrder }: GetArtistSongsArgs) {
    const { data } = await useFetch<any>({
      endpoint: Endpoints.artists.songs,
      params: {
        artistId,
        page,
        sortBy,
        sortOrder,
      },
    })

    // JioSaavn answers `artist.getArtistMoreSong` with
    //   { topSongs: { songs: [...], total, last_page } }
    // and used to answer with a flat { total, start, results } envelope.
    // Support both so the endpoint never silently returns an empty page.
    const rawSongs: any[] = data?.topSongs?.songs ?? data?.results ?? []
    const songs = rawSongs.map(createSongPayload)

    return {
      total: Number(data?.topSongs?.total ?? data?.total ?? songs.length),
      start: Number(data?.topSongs?.start ?? data?.start ?? 0),
      results: songs,
      // The list views read `songs`; `results` is kept for compatibility.
      songs,
    }
  }
}
