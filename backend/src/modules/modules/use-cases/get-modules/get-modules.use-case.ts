import { Endpoints } from '#common/constants'
import { useFetch } from '#common/helpers'
import { createAlbumPayload } from '#modules/albums/helpers'
import { createPlaylistPayload } from '#modules/playlists/helpers'
import { createSongPayload } from '#modules/songs/helpers'
import type { IUseCase } from '#common/types'
import type { z } from 'zod'
import type { ModulesModel } from '../../models/modules.model'

export class GetModulesUseCase implements IUseCase<string, z.infer<typeof ModulesModel>> {
  constructor() {}

  async execute(language: string): Promise<z.infer<typeof ModulesModel>> {
    const { data } = await useFetch<any>({
      endpoint: Endpoints.modules,
      params: {
        language: language || 'hindi,english'
      }
    })

    return {
      albums: data?.new_releases?.map(createAlbumPayload) || [],
      playlists: data?.top_playlists?.map(createPlaylistPayload) || [],
      charts: data?.charts?.map(createPlaylistPayload) || [],
      trending: {
        songs: data?.new_trending?.filter((i: any) => i.type === 'song').map(createSongPayload) || [],
        albums: data?.new_trending?.filter((i: any) => i.type === 'album').map(createAlbumPayload) || []
      }
    }
  }
}
