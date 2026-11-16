import { z } from 'zod'

export const DownloadLinkModel = z.object({
  quality: z.string(),
  url: z.string(),
})

export type DownloadLink = z.infer<typeof DownloadLinkModel>
