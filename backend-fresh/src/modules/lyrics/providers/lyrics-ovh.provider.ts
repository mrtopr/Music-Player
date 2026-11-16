import { extractArtists, scoreHit, splitLyrics } from '#modules/lyrics/helpers'
import { LYRICS_TIMEOUT_MS, type LyricsHit, type LyricsProvider } from '#modules/lyrics/providers/types'

/**
 * lyrics.ovh — https://api.lyrics.ovh
 * Plain-text only (no timestamps) but has very broad coverage and needs no key.
 * Used as the final fallback so the panel shows *something* rather than
 * "Lyrics not available".
 */

const BASE = 'https://api.lyrics.ovh'

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(LYRICS_TIMEOUT_MS),
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`lyrics.ovh ${res.status}`)
  return res.json()
}

export const lyricsOvhProvider: LyricsProvider = {
  id: 'lyrics-ovh',
  name: 'lyrics.ovh',
  supportsSynced: false,
  fetch: async (variant) => {
    const artist = variant.artist || extractArtists(variant.text)[0]
    if (!artist) return null

    const direct = await getJson(
      `${BASE}/v1/${encodeURIComponent(artist)}/${encodeURIComponent(variant.title)}`,
    )
    const directLyrics: string | undefined = direct?.lyrics

    let lyrics = directLyrics
    let matchedTitle = variant.title
    let matchedArtist = artist

    if (!lyrics) {
      // Fall back to the suggest endpoint, which tolerates messy titles.
      const suggest = await getJson(`${BASE}/suggest/${encodeURIComponent(variant.text)}`)
      const first = Array.isArray(suggest?.data) ? suggest.data[0] : null
      if (!first?.title || !first?.artist?.name) return null

      const resolved = await getJson(
        `${BASE}/v1/${encodeURIComponent(first.artist.name)}/${encodeURIComponent(first.title)}`,
      )
      lyrics = resolved?.lyrics
      matchedTitle = first.title
      matchedArtist = first.artist.name
    }

    if (!lyrics) return null

    const { plain } = splitLyrics(lyrics)
    if (!plain) return null

    const base = {
      provider: 'lyrics-ovh',
      providerName: 'lyrics.ovh',
      syncedLyrics: null,
      plainLyrics: plain,
      instrumental: false,
      matchedTitle,
      matchedArtist,
    }
    return { ...base, score: scoreHit(variant, base) } satisfies LyricsHit
  },
}
