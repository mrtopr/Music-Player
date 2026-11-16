import { decodeEntities } from '#modules/lyrics/helpers/normalize.helper'
import { isUsableLyrics, prepareLyrics, scoreHit } from '#modules/lyrics/helpers/score.helper'
import { LYRICS_TIMEOUT_MS, type LyricsHit, type LyricsProvider } from '#modules/lyrics/providers/types'

/**
 * NetEase Cloud Music (网易云音乐) — music.163.com
 * Huge catalogue with timed LRC, good coverage of Indian film music.
 * Two-step: search song id, then fetch its lyric document.
 *
 * NOTE: the newer `/api/search/get/web` endpoint returns an encrypted blob, so
 * this provider deliberately uses the legacy `/api/search/get` endpoint, which
 * still returns plain JSON.
 */

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36'

interface NeteaseSong {
  id?: number
  name?: string
  duration?: number
  artists?: Array<{ name?: string }>
  album?: { name?: string }
}

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Referer: 'https://music.163.com/',
      Cookie: 'os=pc; appver=8.9.70;',
      Accept: 'application/json, text/plain, */*',
    },
    signal: AbortSignal.timeout(LYRICS_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`netease ${res.status}`)
  return res.json()
}

function artistNames(song: NeteaseSong): string | undefined {
  const names = song.artists?.map((artist) => artist.name).filter(Boolean).join(', ')
  return names || undefined
}

export const neteaseProvider: LyricsProvider = {
  id: 'netease',
  name: 'NetEase Cloud Music',
  supportsSynced: true,
  fetch: async (variant) => {
    const searchParams = new URLSearchParams({
      s: variant.text,
      type: '1',
      offset: '0',
      limit: '8',
    })

    const search = await getJson(`https://music.163.com/api/search/get?${searchParams.toString()}`)
    const songs: NeteaseSong[] = Array.isArray(search?.result?.songs) ? search.result.songs : []
    if (songs.length === 0) return null

    const ranked = songs
      .map((song) => {
        const base = {
          provider: 'netease',
          providerName: 'NetEase Cloud Music',
          syncedLyrics: null as string | null,
          plainLyrics: null as string | null,
          instrumental: false,
          matchedTitle: song.name,
          matchedArtist: artistNames(song),
          duration: song.duration ? Number(song.duration) / 1000 : undefined,
        }
        return { song, score: scoreHit(variant, base) }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)

    for (const entry of ranked) {
      const { song } = entry
      if (!song.id) continue

      try {
        const lyric = await getJson(`https://music.163.com/api/song/lyric?id=${song.id}&lv=1&kv=1&tv=-1`)
        const raw: string | undefined = lyric?.lrc?.lyric
        if (!raw) continue

        const { synced, plain } = prepareLyrics(decodeEntities(raw), variant.text)
        if (!isUsableLyrics({ synced, plain })) continue

        const base = {
          provider: 'netease',
          providerName: 'NetEase Cloud Music',
          syncedLyrics: synced,
          plainLyrics: plain,
          instrumental: false,
          matchedTitle: song.name,
          matchedArtist: artistNames(song),
          duration: song.duration ? Number(song.duration) / 1000 : undefined,
        }
        return { ...base, score: scoreHit(variant, base) } satisfies LyricsHit
      } catch {
        // try the next candidate
      }
    }

    return null
  },
}
