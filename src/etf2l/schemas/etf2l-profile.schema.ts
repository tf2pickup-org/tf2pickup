import { z } from 'zod'
import { etf2lTeamSchema } from './etf2l-team.schema'

export const etf2lProfileSchema = z.object({
  id: z.number(),
  name: z.string(),
  country: z.string(),
  classes: z.array(z.string()).or(z.literal(false)),
  registered: z.number(),
  steam: z.object({
    avatar: z.url(),
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
    results: z.url(),
    self: z.url(),
    transfers: z.url(),
  }),
})
