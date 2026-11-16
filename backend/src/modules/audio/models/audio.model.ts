import { z } from '@hono/zod-openapi'

export const AudioProxyQueryModel = z.object({
  url: z.string().openapi({
    description: 'Absolute upstream audio URL (must be on an allow-listed CDN host)',
    example: 'https://aac.saavncdn.com/430/5c5ea5cc00e3bff45616013226f376fe_160.mp4',
  }),
})

export type AudioProxyQuery = z.infer<typeof AudioProxyQueryModel>
