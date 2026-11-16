import { DownloadLinkModel } from '#common/models'
import { z } from 'zod'

export const ArtistMapAPIResponseModel = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  image: z.string(),
  type: z.string(),
  perma_url: z.string(),
})

export const ArtistMapModel = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  image: z.array(DownloadLinkModel),
  type: z.string(),
  url: z.string(),
})
