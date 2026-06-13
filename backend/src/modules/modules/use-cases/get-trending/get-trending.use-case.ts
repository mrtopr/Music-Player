import { Endpoints } from '#common/constants'
import { useFetch } from '#common/helpers'
import { createAlbumPayload } from '#modules/albums/helpers'
import { createSongPayload } from '#modules/songs/helpers'
import type { IUseCase } from '#common/types'
import type { z } from 'zod'
import type { TrendingModel } from '../../models/modules.model'

export class GetTrendingUseCase implements IUseCase<any, z.infer<typeof TrendingModel>> {
  constructor() {}

  async execute(): Promise<z.infer<typeof TrendingModel>> {
    const { data } = await useFetch<any[]>({
      endpoint: Endpoints.trending,
      params: {}
    })

    return {
      songs: data?.filter((i: any) => i.type === 'song').map(createSongPayload) || [],
      albums: data?.filter((i: any) => i.type === 'album').map(createAlbumPayload) || []
    }
  }
}
