import { scoreHit, splitLyrics } from '#modules/lyrics/helpers'
import { LYRICS_TIMEOUT_MS, type LyricsHit, type LyricsProvider, type LyricsQueryVariant } from '#modules/lyrics/providers/types'

/**
 * Kugou (酷狗) lyrics — https://krcs.kugou.com
 * Very strong coverage for Bollywood/Indic tracks and returns real LRC with
 * timestamps. Two-step: search for a candidate, then download its LRC.
 */

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36'

interface KugouCandidate {
  id?: string | number
  accesskey?: string
  song?: string
  singer?: string
  duration?: number | string
}

function decodeBase64Utf8(value: string): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(value, 'base64').toString('utf8')
  const binary = atob(value)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder('utf-8').decode(bytes)
}

async function getJson(url: string, referer: string): Promise<any> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Referer: referer,
      Accept: 'application/json, text/plain, */*',
    },
    signal: AbortSignal.timeout(LYRICS_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`kugou ${res.status}`)
  return res.json()
}

export const kugouProvider: LyricsProvider = {
  id: 'kugou',
  name: 'Kugou',
  supportsSynced: true,
  fetch: async (variant) => {
    const params = new URLSearchParams({
      ver: '1',
      man: 'yes',
      client: 'mobi',
      keyword: variant.text,
    })
    if (variant.duration) params.set('duration', String(Math.round(variant.duration * 1000)))

    const search = await getJson(`https://krcs.kugou.com/search?${params.toString()}`, 'https://www.kugou.com/')
    const candidates: KugouCandidate[] = Array.isArray(search?.candidates) ? search.candidates : []
    if (candidates.length === 0) return null

    // Rank candidates before spending a second request on the download.
    const ranked = candidates
      .map((candidate) => {
        const durationSec = candidate.duration ? Number(candidate.duration) / 1000 : undefined
        const base = {
          provider: 'kugou',
          providerName: 'Kugou',
          syncedLyrics: null as string | null,
          plainLyrics: null as string | null,
          instrumental: false,
          matchedTitle: candidate.song,
          matchedArtist: candidate.singer,
          duration: Number.isFinite(durationSec) ? durationSec : undefined,
        }
        return { candidate, score: scoreHit(variant, base) }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)

    for (const entry of ranked) {
      const { candidate } = entry
      if (!candidate.id || !candidate.accesskey) continue

      try {
        const downloadParams = new URLSearchParams({
          ver: '1',
          client: 'pc',
          id: String(candidate.id),
          accesskey: candidate.accesskey,
          fmt: 'lrc',
          charset: 'utf8',
        })
        const download = await getJson(
          `https://lyrics.kugou.com/download?${downloadParams.toString()}`,
          'https://www.kugou.com/',
        )
        if (!download?.content) continue

        const decoded = decodeBase64Utf8(String(download.content))
        const { synced, plain } = splitLyrics(decoded)
        if (!synced && !plain) continue

        const durationSec = candidate.duration ? Number(candidate.duration) / 1000 : undefined
        const base = {
          provider: 'kugou',
          providerName: 'Kugou',
          syncedLyrics: synced,
          plainLyrics: plain,
          instrumental: false,
          matchedTitle: candidate.song,
          matchedArtist: candidate.singer,
          duration: Number.isFinite(durationSec) ? durationSec : undefined,
        }
        return { ...base, score: scoreHit(variant, base) } satisfies LyricsHit
      } catch {
        // try the next candidate
      }
    }

    return null
  },
}
