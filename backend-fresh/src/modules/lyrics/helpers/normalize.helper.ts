import type { LyricsQuery, LyricsQueryVariant } from '#modules/lyrics/providers/types'

/**
 * Text normalisation + query expansion helpers.
 *
 * JioSaavn titles are messy: "Hero: Main Hoon Hero Tera (From \"Hero\")",
 * "Tum Hi Ho - From \"Aashiqui 2\"", "Song &quot;Title&quot;", etc.
 * Sending those raw to lyric APIs is the main reason lyrics come back empty,
 * so we generate several progressively looser query variants.
 */

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&lt;': '<',
  '&gt;': '>',
  '&nbsp;': ' ',
  '&#x27;': "'",
  '&#x2F;': '/',
}

/** Decode `&#58;` / `&#x27;` style numeric entities. */
function decodeNumericEntity(entity: string): string | null {
  const decimal = /^&#(\d+);$/.exec(entity)
  if (decimal) {
    const code = Number(decimal[1])
    if (Number.isFinite(code) && code > 0 && code <= 0x10ffff) {
      try {
        return String.fromCodePoint(code)
      } catch {
        return null
      }
    }
  }
  const hex = /^&#x([0-9a-fA-F]+);$/.exec(entity)
  if (hex) {
    const code = parseInt(hex[1], 16)
    if (Number.isFinite(code) && code > 0 && code <= 0x10ffff) {
      try {
        return String.fromCodePoint(code)
      } catch {
        return null
      }
    }
  }
  return null
}

export function decodeEntities(input: string): string {
  if (!input) return ''
  let out = input
  // Some payloads are double-encoded.
  for (let pass = 0; pass < 2; pass++) {
    out = out.replace(/&[a-zA-Z#0-9x]+;/g, (match) => {
      const named = ENTITIES[match]
      if (named !== undefined) return named
      return decodeNumericEntity(match) ?? match
    })
  }
  return out
}

/** Record labels that appear in the `subtitle`/`artist` slot but are not artists. */
const LABELS = [
  't-series',
  'tseries',
  'sony music',
  'sonymusic',
  'zee music',
  'zeemusic',
  'saregama',
  'tips',
  'yrf',
  'yash raj',
  'universal music',
  'warner music',
  'emi',
  'speed records',
  'desi music factory',
  'aditya music',
  'lahari music',
  'think music',
  'eros now',
  'eros',
  'shemaroo',
  'pen studios',
  'junglee music',
  'divo',
  'ishtar',
  'believe',
  'the orchard',
  'venus',
  'times music',
  'wave music',
  'ultra',
  'b4u',
  'mayur',
  'srk music',
  'music label',
  'various artists',
  // "Various" alone is what JioSaavn puts in the artist slot for compilations.
  'various',
]

export function isLabel(name?: string): boolean {
  if (!name) return true
  const n = name.toLowerCase().trim()
  if (!n) return true
  return LABELS.some((label) => n === label || n.startsWith(`${label} `) || n.includes(label))
}

/** Strip bracketed qualifiers, "From <movie>" tails, and promo words. */
export function cleanTitle(raw: string): string {
  let title = decodeEntities(raw)
  title = title.replace(/\s*[\(\[][^\)\]]*[\)\]]\s*/g, ' ')
  title = title.replace(/\s*[-–—]\s*(from|feat\.?|ft\.?|with|music by)\b.*$/i, ' ')
  title = title.replace(/\s*\|\s*.*$/, ' ')
  title = title.replace(
    /\b(full\s*song|lyrical|lyrics?|video|audio|official|remastered|hd|4k|8k|mv|song)\b/gi,
    ' ',
  )
  title = title.replace(/\s*["'“”‘’]\s*/g, ' ')
  title = title.replace(/\s+/g, ' ').trim()
  // Trailing separators left behind by the strips above.
  title = title.replace(/[\s\-–—:|,]+$/g, '').trim()
  return title
}

export function normalizeForCompare(input: string): string {
  return decodeEntities(input)
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097F\u00C0-\u024F\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokens(input: string): string[] {
  return normalizeForCompare(input).split(' ').filter((t) => t.length > 1)
}

/** Jaccard-style token overlap in the 0..1 range. */
export function similarity(a: string, b: string): number {
  const ta = new Set(tokens(a))
  const tb = new Set(tokens(b))
  if (!ta.size || !tb.size) return 0
  let shared = 0
  for (const token of ta) if (tb.has(token)) shared++
  return shared / Math.max(ta.size, tb.size)
}

/** Drop label names and junk from a comma/"&" separated artist string. */
export function extractArtists(raw?: string): string[] {
  if (!raw) return []
  return decodeEntities(raw)
    .split(/\s*(?:,|&|\bfeat\.?\b|\bft\.?\b|\band\b|\bx\b)\s*/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 1 && !isLabel(part))
    .slice(0, 3)
}

/** "First five words" fallback for long titles. */
function shorten(title: string, maxWords = 5): string {
  const words = title.split(' ').filter(Boolean)
  return words.length <= maxWords ? title : words.slice(0, maxWords).join(' ')
}

export function buildVariants(query: LyricsQuery): LyricsQueryVariant[] {
  const originalTitle = decodeEntities(query.title || '').trim()
  const cleaned = cleanTitle(originalTitle)
  const artists = extractArtists(query.artist)
  const artist = artists[0]
  const album = query.album ? decodeEntities(query.album).trim() : undefined

  const seen = new Set<string>()
  const variants: LyricsQueryVariant[] = []

  const push = (title: string, artistName?: string, withAlbum = false) => {
    const safeTitle = title.trim()
    if (!safeTitle) return
    const key = `${safeTitle.toLowerCase()}|${(artistName || '').toLowerCase()}`
    if (seen.has(key)) return
    seen.add(key)
    variants.push({
      title: safeTitle,
      artist: artistName,
      album: withAlbum ? album : undefined,
      duration: query.duration,
      text: [safeTitle, artistName].filter(Boolean).join(' '),
    })
  }

  // 1. Best case: cleaned title + real artist
  push(cleaned || originalTitle, artist)
  // 2. Second listed artist — the first slot is often a composer or label.
  const secondary = artists[1]
  if (secondary) push(cleaned || originalTitle, secondary)
  // 3. Same title, no artist (handles wrong/missing artist metadata)
  push(cleaned || originalTitle)
  // 4. Original title (keeps "Hero: ..." style prefixes that some DBs index)
  if (originalTitle && originalTitle !== cleaned) {
    push(originalTitle, artist)
    push(originalTitle)
  }
  // 5. Shortened title for over-long names
  const short = shorten(cleaned || originalTitle)
  if (short && short !== cleaned) push(short, artist)

  return variants
}
