import { Endpoints } from '#common/constants'
import { useFetch } from '#common/helpers'
import { createModulesPayload } from '#modules/modules/helpers'
import { createSongPayload } from '#modules/songs/helpers'

type AnyRecord = Record<string, any>

export class ModulesService {
  async getModules(language: string) {
    const { data } = await useFetch<any>({ endpoint: Endpoints.modules, params: { language } })
    const payload = createModulesPayload(data)

    // The "trending" shelf upstream only carries a handful of songs; the rest
    // of it is albums and playlists. For the home page we want a real list of
    // playable trending songs, so we pull the songs of the trending playlist
    // that ships with the shelf ("Now Trending" and friends).
    if (payload.trending.songs.length < 10) {
      const trendingPlaylist = (data?.new_trending ?? []).find(
        (item: AnyRecord) => item?.type === 'playlist' && item?.id,
      )

      if (trendingPlaylist) {
        try {
          const { data: playlistData } = await useFetch<any>({
            endpoint: Endpoints.playlists.id,
            params: { listid: trendingPlaylist.id, n: 30, p: 0 },
          })

          const playlistSongs = Array.isArray(playlistData?.list)
            ? playlistData.list
                .filter((song: AnyRecord) => song?.type === 'song' || song?.more_info?.encrypted_media_url)
                .map(createSongPayload)
            : []

          if (playlistSongs.length) {
            const seen = new Set(payload.trending.songs.map((song: AnyRecord) => song.id))
            const merged = [
              ...playlistSongs,
              ...payload.trending.songs.filter((song: AnyRecord) => !seen.has(song.id)),
            ]
            payload.trending.songs = merged
          }
        } catch {
          // A missing trending playlist must never break the home page.
        }
      }
    }

    return payload
  }

  async getTrending() {
    const { data } = await useFetch({ endpoint: Endpoints.trending, params: {} })
    return data
  }
}
