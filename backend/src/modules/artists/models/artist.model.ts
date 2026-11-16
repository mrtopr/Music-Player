import { DownloadLinkModel } from '#common/models'
import { AlbumAPIResponseModel, AlbumModel } from '#modules/albums/models'
import { SongAPIResponseModel, SongModel } from '#modules/songs/models'
import { z } from 'zod'

const AlbumRefModel = z.object({
  id: z.string(),
  title: z.string(),
  image: z.string(),
  perma_url: z.string(),
  year: z.string().optional(),
  language: z.string().optional(),
})

export { AlbumRefModel }

export const ArtistAPIResponseModel = z.object({
  artistId: z.string().optional(),
  id: z.string(),
  name: z.string(),
  type: z.string(),
  perma_url: z.string(),
  image: z.string(),
  follower_count: z.string().optional(),
  fan_count: z.string().optional(),
  isVerified: z.boolean().optional(),
  dominantLanguage: z.string().optional(),
  dominantType: z.string().optional(),
  bio: z.string().optional(),
  dob: z.string().optional(),
  fb: z.string().optional(),
  twitter: z.string().optional(),
  wiki: z.string().optional(),
  availableLanguages: z.string().optional(),
  isRadioPresent: z.boolean().optional(),
  urls: z.object({
    overview: z.string().optional(),
  }).optional(),
  topSongs: z.array(SongAPIResponseModel).optional(),
  topAlbums: z.array(AlbumAPIResponseModel).optional(),
  singles: z.array(SongAPIResponseModel).optional(),
  similarArtists: z.array(z.any()).optional(),
})

export const ArtistModel = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().nullable(),
  type: z.string(),
  followerCount: z.number().nullable(),
  fanCount: z.string().nullable(),
  isVerified: z.boolean().nullable(),
  dominantLanguage: z.string().nullable(),
  dominantType: z.string().nullable(),
  bio: z.any().nullable(),
  dob: z.string().nullable(),
  fb: z.string().nullable(),
  twitter: z.string().nullable(),
  wiki: z.string().nullable(),
  availableLanguages: z.string().nullable(),
  isRadioPresent: z.boolean().nullable(),
  image: z.array(DownloadLinkModel),
  topSongs: z.array(SongModel).nullable(),
  topAlbums: z.array(AlbumModel).nullable(),
  singles: z.array(SongModel).nullable(),
  similarArtists: z.array(z.any()).nullable(),
})

export const ArtistSongModel = z.object({
  total: z.number(),
  start: z.number(),
  results: z.array(SongModel),
  /** Same list as `results`, under the name the list views expect. */
  songs: z.array(SongModel),
})

export const ArtistAlbumModel = z.object({
  total: z.number(),
  start: z.number(),
  results: z.array(AlbumModel),
  /** Same list as `results`, under the name the list views expect. */
  albums: z.array(AlbumModel),
})
