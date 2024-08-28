import { z } from 'zod'
import { etf2lTeamSchema } from './etf2l-team.schema'

export const etf2lProfileSchema = z.object({
  id: z.number(),
  name: z.string(),
  country: z.string(),
  classes: z.array(z.string()),
  registered: z.number(),
  steam: z.object({
    avatar: z.string().url(),
    id: z.string(),
    id3: z.string(),
    id64: z.string(),
  }),
  bans: z
    .array(
      z.object({
        start: z.number(),
        end: z.number(),
        reason: z.string(),
      }),
    )
    .nullable(),
  teams: z.array(etf2lTeamSchema).nullable(),
  title: z.literal('Player'),
  urls: z.object({
    results: z.string().url(),
    self: z.string().url(),
    transfers: z.string().url(),
  }),
})
