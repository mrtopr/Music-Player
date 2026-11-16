/**
 * Shared types for the lyrics provider chain.
 */

export interface LyricsQuery {
  /** Track title as supplied by the client (may contain HTML entities / noise). */
  title: string
  /** Primary artist. Optional — many sources only need the title. */
  artist?: string
  album?: string
  /** Track length in seconds, used to reject wrong matches. */
  duration?: number
}

/** A normalised query shape that providers actually receive. */
export interface LyricsQueryVariant {
  title: string
  artist?: string
  album?: string
  duration?: number
  /** Free-text form used by search endpoints. */
  text: string
}

export interface LyricsHit {
  provider: string
  providerName: string
  syncedLyrics: string | null
  plainLyrics: string | null
  instrumental: boolean
  matchedTitle?: string
  matchedArtist?: string
  duration?: number
  /** Higher is better. Used to choose between providers that both answered. */
  score: number
}

export interface LyricsProvider {
  id: string
  name: string
  supportsSynced: boolean
  fetch: (variant: LyricsQueryVariant) => Promise<LyricsHit | null>
}

export const LYRICS_TIMEOUT_MS = 6000
