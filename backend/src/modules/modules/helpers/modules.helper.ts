import { createImageLinks } from '#common/helpers'
import { createAlbumPayload } from '#modules/albums/helpers'
import { createPlaylistPayload } from '#modules/playlists/helpers'
import { createSongPayload } from '#modules/songs/helpers'

type AnyRecord = Record<string, any>

const asArray = (value: unknown): AnyRecord[] => (Array.isArray(value) ? (value as AnyRecord[]) : [])

const byType = (items: AnyRecord[], type: string) => items.filter((item) => item?.type === type)

/** Shelves overlap upstream (the same album shows up in two of them). */
const uniqueById = <T extends { id?: string }>(items: T[]): T[] => {
  const seen = new Set<string>()
  return items.filter((item) => {
    const id = String(item?.id ?? '')
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

/**
 * A playlist as it is used by the card components: both `name` and `title`
 * are provided so the cards do not have to know which one a shelf uses.
 */
const createPlaylistRef = (playlist: AnyRecord) => {
  const payload = createPlaylistPayload(playlist as any)
  return {
    ...payload,
    title: payload.name,
    subtitle: playlist.subtitle ?? '',
  }
}

/**
 * `content.getBrowseModules` answers with a set of loosely-typed shelves:
 *
 *   new_trending[]  songs + albums + playlists
 *   new_albums[]    albums + songs
 *   charts[]        playlists
 *   browse_discover[] channels / playlists
 *   top_playlists[] playlists
 *
 * It used to be passed straight through to the client, which meant every
 * consumer had to know the upstream field names (`title` vs `name`, `image`
 * as a string vs an array of links, no `downloadUrl` …) and the home page
 * rendered nothing because the keys it expected (`trending.songs`,
 * `playlists`) do not exist upstream.
 *
 * The payload is normalised here into the same shape the rest of the API
 * uses, split by content type, so the client can render the cards and hand
 * the songs to the player without any per-screen conversion.
 */
export const createModulesPayload = (data: any) => {
  const trendingShelf = asArray(data?.new_trending ?? data?.trending?.songs)
  const newAlbumsShelf = asArray(data?.new_albums ?? data?.trending?.albums)
  const chartsShelf = asArray(data?.charts)
  const discoverShelf = asArray(data?.browse_discover)
  const playlistsShelf = asArray(data?.top_playlists)

  return {
    trending: {
      songs: uniqueById(byType(trendingShelf, 'song').map((item) => createSongPayload(item as any))),
      albums: uniqueById(byType(trendingShelf, 'album').map((item) => createAlbumPayload(item as any))),
      playlists: uniqueById(byType(trendingShelf, 'playlist').map(createPlaylistRef)),
    },
    newReleases: {
      albums: uniqueById(byType(newAlbumsShelf, 'album').map((item) => createAlbumPayload(item as any))),
      songs: uniqueById(byType(newAlbumsShelf, 'song').map((item) => createSongPayload(item as any))),
    },
    charts: {
      playlists: uniqueById(byType(chartsShelf, 'playlist').map(createPlaylistRef)),
      songs: uniqueById(byType(chartsShelf, 'song').map((item) => createSongPayload(item as any))),
    },
    discover: uniqueById(discoverShelf.map((item) =>
      item?.type === 'song' ? createSongPayload(item as any) : createPlaylistRef(item),
    )),
    playlists: uniqueById(playlistsShelf.map(createPlaylistRef)),
    radio: data?.radio ?? null,
    topShows: data?.top_shows ?? null,
  }
}

export { createImageLinks }
