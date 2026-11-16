import { createDownloadLinks, createImageLinks } from '#common/helpers'
import { createArtistMapPayload } from '#modules/artists/helpers'
import type { SongAPIResponseModel, SongModel } from '#modules/songs/models'
import type { z } from 'zod'

export const createSongPayload = (song: z.infer<typeof SongAPIResponseModel>): z.infer<typeof SongModel> => {
  const artistMap = song.more_info?.artistMap
  const declaredPrimary = artistMap?.primary_artists ?? []
  const allArtists = artistMap?.artists ?? []

  // Some upstream responses ship no `primary_artists`. Fall back to the
  // people actually credited with the music so the UI never has to show
  // "Unknown Artist".
  const musicArtists = allArtists.filter(
    (artist) => artist.role === 'music' || artist.role === 'primary_artists',
  )
  const primaryNames = (declaredPrimary.length ? declaredPrimary : musicArtists)
    .map((artist) => artist.name)
    .filter(Boolean)

  return {
    id: song.id,
    name: song.title,
    type: song.type,
    year: song.year || null,
    releaseDate: song.more_info?.release_date || null,
    duration: song.more_info?.duration ? Number(song.more_info?.duration) : null,
    label: song.more_info?.label || null,
    explicitContent: song.explicit_content === '1',
    playCount: song.play_count ? Number(song.play_count) : null,
    language: song.language,
    hasLyrics: song.more_info?.has_lyrics === 'true',
    lyricsId: song.more_info?.lyrics_id || null,
    url: song.perma_url,
    copyright: song.more_info?.copyright_text || null,
    // Flat artist string — every list view in the app reads this first.
    primaryArtists: primaryNames.join(', ') || song.more_info?.music || '',
    album: {
      id: song.more_info?.album_id || null,
      name: song.more_info?.album || null,
      url: song.more_info?.album_url || null,
    },
    artists: {
      primary: declaredPrimary.map(createArtistMapPayload),
      featured: (artistMap?.featured_artists ?? []).map(createArtistMapPayload),
      all: allArtists.map(createArtistMapPayload),
    },
    image: createImageLinks(song.image),
    downloadUrl: createDownloadLinks(song.more_info?.encrypted_media_url),
  }
}
