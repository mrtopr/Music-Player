import { DownloadLinkModel } from '#common/models'
import { ArtistMapAPIResponseModel, ArtistMapModel } from '#modules/artists/models/artist-map.model'
import { SongModel } from '#modules/songs/models'
import { z } from 'zod'

export const AlbumAPIResponseModel = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string(),
  header_desc: z.string(),
  type: z.string(),
  perma_url: z.string(),
  image: z.string(),
  language: z.string(),
  year: z.string(),
  play_count: z.string(),
  explicit_content: z.string(),
  list_count: z.string(),
  list_type: z.string(),
  list: z.array(z.any()),
  more_info: z.object({
    music: z.string().optional(),
    song_count: z.string().optional(),
    copyright_text: z.string().optional(),
    // The album's own credits — an object, not a list.
    artistMap: z
      .object({
        primary_artists: z.array(ArtistMapAPIResponseModel).optional(),
        featured_artists: z.array(ArtistMapAPIResponseModel).optional(),
        artists: z.array(ArtistMapAPIResponseModel).optional(),
      })
      .optional(),
    artists: z.array(ArtistMapAPIResponseModel).optional(),
  }),
})

export const AlbumModel = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  year: z.number().nullable(),
  type: z.string(),
  playCount: z.number().nullable(),
  language: z.string(),
  explicitContent: z.boolean(),
  url: z.string(),
  image: z.array(DownloadLinkModel),
  songs: z.array(SongModel).nullable(),
  artists: z.array(ArtistMapModel).nullable(),
})
