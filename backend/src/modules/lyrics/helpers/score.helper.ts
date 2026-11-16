import { normalizeForCompare, similarity } from '#modules/lyrics/helpers/normalize.helper'
import type { LyricsHit, LyricsQueryVariant } from '#modules/lyrics/providers/types'

/**
 * Words that mark an alternate recording. If the candidate has one and the
 * query does not, it is almost certainly the wrong version of the song.
 */
const ALT_VERSION_WORDS = [
  'sad',
  'remix',
  'live',
  'reprise',
  'unplugged',
  'female',
  'acoustic',
  'karaoke',
  'cover',
  'slowed',
  'reverb',
  'lofi',
  'extended',
  'instrumental',
  'orchestral',
  'piano',
]

function versionPenalty(variantTitle: string, matchedTitle?: string): number {
  if (!matchedTitle) return 0
  const query = normalizeForCompare(variantTitle)
  const matched = normalizeForCompare(matchedTitle)
  let penalty = 0
  for (const word of ALT_VERSION_WORDS) {
    if (matched.includes(word) && !query.includes(word)) penalty += 12
  }
  return penalty
}


/**
 * Score a candidate result so that, when several providers answer, we keep the
 * one that is most likely the right song: synced beats plain, correct duration
 * beats wrong duration, similar title beats unrelated title.
 */
export function scoreHit(
  variant: LyricsQueryVariant,
  hit: Omit<LyricsHit, 'score'>,
): number {
  let score = 0

  if (hit.syncedLyrics) score += 50
  if (hit.plainLyrics) score += 10
  if (hit.instrumental) score -= 5

  // Title similarity (0..20)
  if (hit.matchedTitle) {
    score += Math.round(similarity(variant.title, hit.matchedTitle) * 20)
    if (normalizeForCompare(variant.title) === normalizeForCompare(hit.matchedTitle)) score += 15
    score -= versionPenalty(variant.title, hit.matchedTitle)
  }

  // Artist similarity (0..10)
  if (variant.artist && hit.matchedArtist) {
    score += Math.round(similarity(variant.artist, hit.matchedArtist) * 10)
  }

  // Duration agreement is the strongest signal for covers/live versions.
  if (variant.duration && hit.duration) {
    const diff = Math.abs(variant.duration - hit.duration)
    if (diff <= 2) score += 30
    else if (diff <= 5) score += 18
    else if (diff <= 10) score += 8
    else if (diff > 45) score -= 20
  }

  // A hit with no usable text is worthless.
  if (!hit.syncedLyrics && !hit.plainLyrics) score -= 100

  return score
}

export function lrcHasTimestamps(text?: string | null): boolean {
  return !!text && /\[\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?\]/.test(text)
}

const CJK_CHARS = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]+/g

/**
 * QQ Music and NetEase often return bilingual LRC: the original line followed
 * by a Chinese translation line. For a non-CJK song that translation is noise,
 * so drop pure-translation lines and strip translated fragments that share a
 * line with the original.
 */
export function stripTranslationLines(lyrics: string, reference: string): string {
  if (!lyrics || !lyrics.trim()) return lyrics
  // The song itself is CJK — the "translation" is the actual lyric.
  if (new RegExp(CJK_CHARS.source).test(reference)) return lyrics

  const out: string[] = []
  for (const line of lyrics.split('\n')) {
    const match = /^((?:\[[^\]]*\]\s*)*)(.*)$/.exec(line)
    if (!match) {
      out.push(line)
      continue
    }
    const tags = match[1] || ''
    const body = match[2] || ''
    if (!body.trim()) {
      out.push(line)
      continue
    }
    const cleaned = body.replace(CJK_CHARS, '').replace(/\s{2,}/g, ' ').trim()
    if (!cleaned) continue
    out.push(`${tags}${cleaned}`)
  }
  return out.join('\n')
}

/**
 * Some providers return "LRC" that is actually plain text with a single
 * header. Treat it as plain so the UI does not render an unsynced block as
 * if it were timed.
 */
export function splitLyrics(raw?: string | null): { synced: string | null; plain: string | null } {
  if (!raw || !raw.trim()) return { synced: null, plain: null }
  if (lrcHasTimestamps(raw)) return { synced: raw, plain: null }
  return { synced: null, plain: raw.trim() }
}

/** Split + de-translate a raw provider payload in one step. */
export function prepareLyrics(
  raw: string | null | undefined,
  reference: string,
): { synced: string | null; plain: string | null } {
  if (!raw || !raw.trim()) return { synced: null, plain: null }
  return splitLyrics(stripTranslationLines(raw, reference))
}

/**
 * Guard against "lyrics" that lost all their content — e.g. a Chinese cover of
 * an English song, where stripping translations leaves one stray line. Such a
 * result must not win; the chain should keep looking.
 */
export function isUsableLyrics(parts: { synced: string | null; plain: string | null }): boolean {
  if (parts.synced) {
    const timed = parts.synced.match(/\[\d{1,3}:\d{1,2}/g)
    if (timed && timed.length >= 2) return true
  }
  if (parts.plain) {
    const lines = parts.plain.split('\n').filter((line) => line.trim())
    if (lines.length >= 2) return true
  }
  return false
}
