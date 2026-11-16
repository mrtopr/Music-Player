import { decodeEntities } from '#modules/lyrics/helpers/normalize.helper'
import { isUsableLyrics, prepareLyrics, scoreHit } from '#modules/lyrics/helpers/score.helper'
import { LYRICS_TIMEOUT_MS, type LyricsHit, type LyricsProvider } from '#modules/lyrics/providers/types'

/**
 * QQ Music (QQ音乐) — y.qq.com
 * Excellent coverage of international and Indian film music, and returns real
 * timed LRC. Two-step: search for a songmid, then fetch its lyric document.
 *
 * The search endpoint answers with JSONP (`callback({...})`), so the wrapper is
 * stripped before parsing. `nobase64=1` makes the lyric endpoint return plain
 * LRC instead of a base64 blob.
 */

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36'

interface QqSong {
  songmid?: string
  songname?: string
  interval?: number
  singer?: Array<{ name?: string }>
  albumname?: string
}

/** The QQ endpoints sometimes wrap JSON in a JSONP callback. */
function parseJsonp(text: string): any {
  const trimmed = text.trim()
  if (trimmed.startsWith('{')) {
    try {
      return JSON.parse(trimmed)
    } catch {
      return null
    }
  }
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  try {
    return JSON.parse(trimmed.slice(start, end + 1))
  } catch {
    return null
  }
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
  if (!res.ok) throw new Error(`qq ${res.status}`)
  return parseJsonp(await res.text())
}

function singerNames(song: QqSong): string | undefined {
  const names = song.singer?.map((artist) => artist.name).filter(Boolean).join(', ')
  return names || undefined
}

export const qqProvider: LyricsProvider = {
  id: 'qq',
  name: 'QQ Music',
  supportsSynced: true,
  fetch: async (variant) => {
    const searchParams = new URLSearchParams({
      w: variant.text,
      format: 'json',
      n: '8',
      p: '1',
    })

    const search = await getJson(
      `https://c.y.qq.com/soso/fcgi-bin/client_search_cp?${searchParams.toString()}`,
      'https://y.qq.com/',
    )
    const songs: QqSong[] = search?.data?.song?.list || []
    if (songs.length === 0) return null

    const ranked = songs
      .map((song) => {
        const base = {
          provider: 'qq',
          providerName: 'QQ Music',
          syncedLyrics: null as string | null,
          plainLyrics: null as string | null,
          instrumental: false,
          matchedTitle: song.songname,
          matchedArtist: singerNames(song),
          duration: song.interval ? Number(song.interval) : undefined,
        }
        return { song, score: scoreHit(variant, base) }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)

    for (const entry of ranked) {
      const { song } = entry
      if (!song.songmid) continue

      try {
        const lyric = await getJson(
          `https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songmid=${encodeURIComponent(song.songmid)}&format=json&nobase64=1&g_tk=5381`,
          'https://y.qq.com/portal/player.html',
        )
        const raw: string | undefined = lyric?.lyric
        if (!raw) continue

        const { synced, plain } = prepareLyrics(decodeEntities(raw), variant.text)
        if (!isUsableLyrics({ synced, plain })) continue

        const base = {
          provider: 'qq',
          providerName: 'QQ Music',
          syncedLyrics: synced,
          plainLyrics: plain,
          instrumental: false,
          matchedTitle: song.songname,
          matchedArtist: singerNames(song),
          duration: song.interval ? Number(song.interval) : undefined,
        }
        return { ...base, score: scoreHit(variant, base) } satisfies LyricsHit
      } catch {
        // try the next candidate
      }
    }

    return null
  },
}
