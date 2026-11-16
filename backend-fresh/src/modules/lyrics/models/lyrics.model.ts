import { z } from '@hono/zod-openapi'

export const LyricsResponseModel = z.object({
  found: z.boolean().openapi({ description: 'Whether lyrics were resolved from any provider' }),
  provider: z.string().nullable().openapi({ description: 'Provider id that produced the lyrics' }),
  providerName: z.string().nullable().openapi({ description: 'Human readable provider name' }),
  isSynced: z.boolean().openapi({ description: 'True when timed LRC lines are available' }),
  syncedLyrics: z.string().nullable().openapi({ description: 'Raw LRC text with [mm:ss.xx] timestamps' }),
  plainLyrics: z.string().nullable().openapi({ description: 'Unsynced plain text lyrics' }),
  instrumental: z.boolean().openapi({ description: 'Track is marked as instrumental' }),
  matchedTitle: z.string().nullable().optional(),
  matchedArtist: z.string().nullable().optional(),
  duration: z.number().nullable().optional(),
  triedProviders: z.array(z.string()).openapi({ description: 'Providers consulted, in order' }),
})

export type LyricsResponse = z.infer<typeof LyricsResponseModel>

export const LyricsProviderModel = z.object({
  id: z.string(),
  name: z.string(),
  supportsSynced: z.boolean(),
})
