export * from './types'
export { lrclibProvider } from './lrclib.provider'
export { neteaseProvider } from './netease.provider'
export { qqProvider } from './qq.provider'
export { kugouProvider } from './kugou.provider'
export { lyricsOvhProvider } from './lyrics-ovh.provider'

import { lrclibProvider } from './lrclib.provider'
import { neteaseProvider } from './netease.provider'
import { qqProvider } from './qq.provider'
import { kugouProvider } from './kugou.provider'
import { lyricsOvhProvider } from './lyrics-ovh.provider'
import type { LyricsProvider } from './types'

/**
 * Provider registry, ordered by expected quality and reliability.
 * The service still scores results, so order only breaks ties.
 *
 *   lrclib   — best synced source, no key
 *   netease  — huge catalogue, synced LRC
 *   qq       — huge catalogue, synced LRC
 *   kugou    — strong Indic coverage (geo-restricted in some regions)
 *   lyrics-ovh — plain text last resort
 */
export const LYRICS_PROVIDERS: LyricsProvider[] = [
  lrclibProvider,
  neteaseProvider,
  qqProvider,
  kugouProvider,
  lyricsOvhProvider,
]

/** Providers that can return timed LRC. */
export const SYNCED_PROVIDERS: LyricsProvider[] = [lrclibProvider, neteaseProvider, qqProvider, kugouProvider]
