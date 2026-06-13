import { DownloadLinkModel } from '#common/models'
import { AlbumModel } from '#modules/albums/models'
import { ArtistMapModel } from '#modules/artists/models'
import { PlaylistModel } from '#modules/playlists/models'
import { SongModel } from '#modules/songs/models'
import { z } from 'zod'

export const ModulesModel = z.object({
  albums: z.array(AlbumModel),
  playlists: z.array(PlaylistModel),
  charts: z.array(PlaylistModel),
  trending: z.object({
    songs: z.array(SongModel),
    albums: z.array(AlbumModel)
  })
})

export const TrendingModel = z.object({
  songs: z.array(SongModel),
  albums: z.array(AlbumModel)
})
