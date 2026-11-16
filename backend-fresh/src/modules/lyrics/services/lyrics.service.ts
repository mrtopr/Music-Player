import { buildVariants } from '#modules/lyrics/helpers'
import { isUsableLyrics, prepareLyrics } from '#modules/lyrics/helpers/score.helper'
import {
  LYRICS_PROVIDERS,
  SYNCED_PROVIDERS,
  lyricsOvhProvider,
  type LyricsHit,
  type LyricsProvider,
  type LyricsQuery,
  type LyricsQueryVariant,
} from '#modules/lyrics/providers'

interface CacheEntry {
  expires: number
  value: LyricsHit | null
}

const POSITIVE_TTL_MS = 12 * 60 * 60 * 1000 // 12h — lyrics never change
const NEGATIVE_TTL_MS = 10 * 60 * 1000 // 10min — a miss may be a transient outage
const PROVIDER_BUDGET_MS = 9000
const MAX_CACHE_ENTRIES = 500

function withTimeout<T>(promise: Promise<T | null>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms)
    promise
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch(() => {
        clearTimeout(timer)
        resolve(null)
      })
  })
}

/** Strip translations and reject payloads that lost their content. */
function finalize(hit: LyricsHit, reference: string): LyricsHit | null {
  const fromSynced = hit.syncedLyrics ? prepareLyrics(hit.syncedLyrics, reference) : { synced: null, plain: null }
  const fromPlain = hit.plainLyrics ? prepareLyrics(hit.plainLyrics, reference) : { synced: null, plain: null }

  const synced = fromSynced.synced
  const plain = fromPlain.plain ?? fromSynced.plain
  if (!isUsableLyrics({ synced, plain })) return null

  return { ...hit, syncedLyrics: synced, plainLyrics: plain }
}

/** Ask one provider across a list of query variants, stopping at the first hit. */
async function tryProvider(provider: LyricsProvider, variants: LyricsQueryVariant[]): Promise<LyricsHit | null> {
  for (const variant of variants) {
    try {
      const hit = await provider.fetch(variant)
      if (!hit || (!hit.syncedLyrics && !hit.plainLyrics)) continue
      const cleaned = finalize(hit, variant.text)
      if (cleaned) return cleaned
    } catch {
      // Provider outage or timeout — move on to the next variant.
    }
  }
  return null
}

/** Ask several providers in parallel, keep the best-scoring answer. */
async function raceProviders(
  providers: LyricsProvider[],
  variants: LyricsQueryVariant[],
): Promise<LyricsHit | null> {
  if (variants.length === 0) return null

  const results = await Promise.all(
    providers.map((provider) => withTimeout(tryProvider(provider, variants), PROVIDER_BUDGET_MS)),
  )

  const hits = results.filter((hit): hit is LyricsHit => !!hit)
  if (hits.length === 0) return null

  hits.sort((a, b) => b.score - a.score)
  return hits[0]
}

export class LyricsService {
  private cache = new Map<string, CacheEntry>()

  /**
   * Resolve lyrics with automatic provider fallback.
   *
   * The chain is intentionally staged so a failure in one source is invisible:
   *   1. best synced sources, exact query
   *   2. best synced sources, loosened query
   *   3. plain-text sources (lyrics.ovh) so the user always sees *something*
   */
  async getLyrics(query: LyricsQuery, preferredProvider?: string): Promise<LyricsHit | null> {
    if (!query.title || !query.title.trim()) return null

    const cacheKey = this.buildCacheKey(query, preferredProvider)
    const cached = this.cache.get(cacheKey)
    if (cached && cached.expires > Date.now()) return cached.value

    const variants = buildVariants(query)
    if (variants.length === 0) return null

    let hit: LyricsHit | null = null

    // User-selected provider gets first refusal.
    if (preferredProvider && preferredProvider !== 'auto') {
      const chosen = LYRICS_PROVIDERS.find((provider) => provider.id === preferredProvider)
      if (chosen) hit = await raceProviders([chosen], variants.slice(0, 2))
    }

    // Stage 1 — synced, best query variants (primary artist, then second artist).
    if (!hit) {
      hit = await raceProviders(SYNCED_PROVIDERS, variants.slice(0, 2))
    }

    // Stage 2 — synced, looser queries (no artist / original title / shortened).
    if (!hit) {
      hit = await raceProviders(SYNCED_PROVIDERS, variants.slice(2))
    }

    // Stage 3 — plain text, so the panel is never empty when we can avoid it.
    if (!hit) {
      hit = await raceProviders([lyricsOvhProvider, ...SYNCED_PROVIDERS], variants.slice(0, 2))
    }

    this.store(cacheKey, hit)
    return hit
  }

  getProviders() {
    return LYRICS_PROVIDERS.map((provider) => ({
      id: provider.id,
      name: provider.name,
      supportsSynced: provider.supportsSynced,
    }))
  }

  private buildCacheKey(query: LyricsQuery, preferred?: string): string {
    return [
      preferred || 'auto',
      query.title.toLowerCase().trim(),
      (query.artist || '').toLowerCase().trim(),
      query.duration ? Math.round(query.duration) : '',
    ].join('|')
  }

  private store(key: string, value: LyricsHit | null) {
    if (this.cache.size >= MAX_CACHE_ENTRIES) {
      const oldest = this.cache.keys().next().value
      if (oldest) this.cache.delete(oldest)
    }
    this.cache.set(key, {
      expires: Date.now() + (value ? POSITIVE_TTL_MS : NEGATIVE_TTL_MS),
      value,
    })
  }
}
