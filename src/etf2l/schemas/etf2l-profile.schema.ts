import { z } from 'zod'

export const etf2lProfileSchema = z.object({
  id: z.number(),
  name: z.string(),
  country: z.string(),
  bans: z
    .array(
      z.object({
        start: z.number(),
        end: z.number(),
        reason: z.string(),
      }),
    )
    .nullable(),
})
