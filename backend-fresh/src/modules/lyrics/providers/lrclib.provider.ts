import { scoreHit } from '#modules/lyrics/helpers'
import { LYRICS_TIMEOUT_MS, type LyricsHit, type LyricsProvider, type LyricsQueryVariant } from '#modules/lyrics/providers/types'

/**
 * LRCLIB — https://lrclib.net
 * Community lyrics DB with proper LRC timestamps. Best synced source when it
 * has the track. No API key, no rate-limit headers required.
 */

const BASE = 'https://lrclib.net/api'
const UA = 'Mehfil/1.0 (https://github.com/mrtopr/Music-Player)'

interface LrclibRecord {
  id?: number
  trackName?: string
  artistName?: string
  albumName?: string
  duration?: number
  instrumental?: boolean
  plainLyrics?: string | null
  syncedLyrics?: string | null
}

async function getJson(url: string): Promise<unknown | null> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(LYRICS_TIMEOUT_MS),
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`lrclib ${res.status}`)
  return res.json()
}

function toHit(record: LrclibRecord, variant: LyricsQueryVariant): LyricsHit | null {
  if (!record) return null
  const synced = record.syncedLyrics?.trim() || null
  const plain = record.plainLyrics?.trim() || null
  if (!synced && !plain && !record.instrumental) return null

  const base = {
    provider: 'lrclib',
    providerName: 'LRCLIB',
    syncedLyrics: synced,
    plainLyrics: plain,
    instrumental: !!record.instrumental,
    matchedTitle: record.trackName,
    matchedArtist: record.artistName,
    duration: record.duration,
  }

  return { ...base, score: scoreHit(variant, base) }
}

export const lrclibProvider: LyricsProvider = {
  id: 'lrclib',
  name: 'LRCLIB',
  supportsSynced: true,
  fetch: async (variant) => {
    // 1. Exact lookup — highest precision, needs a duration in seconds.
    if (variant.artist && variant.duration) {
      const params = new URLSearchParams({
        track_name: variant.title,
        artist_name: variant.artist,
        duration: String(Math.round(variant.duration)),
      })
      if (variant.album) params.set('album_name', variant.album)

      const exact = (await getJson(`${BASE}/get?${params.toString()}`)) as LrclibRecord | null
      if (exact) {
        const hit = toHit(exact, variant)
        if (hit) return hit
      }
    }

    // 2. Structured search — forgiving on duration.
    const searchParams = new URLSearchParams({ track_name: variant.title })
    if (variant.artist) searchParams.set('artist_name', variant.artist)

    const structured = (await getJson(`${BASE}/search?${searchParams.toString()}`)) as LrclibRecord[] | null
    const structuredHit = pickBest(structured, variant)
    if (structuredHit) return structuredHit

    // 3. Free-text search — last resort, catches odd metadata.
    const free = (await getJson(`${BASE}/search?q=${encodeURIComponent(variant.text)}`)) as LrclibRecord[] | null
    return pickBest(free, variant)
  },
}

function pickBest(records: LrclibRecord[] | null, variant: LyricsQueryVariant): LyricsHit | null {
  if (!Array.isArray(records) || records.length === 0) return null
  const hits = records
    .slice(0, 12)
    .map((record) => toHit(record, variant))
    .filter((hit): hit is LyricsHit => !!hit)
    .sort((a, b) => b.score - a.score)
  return hits[0] ?? null
}
