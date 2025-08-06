import { z } from 'zod'
import { etf2lCompetitionSchema } from './etf2l-competition.schema'

export const etf2lTeamSchema = z.object({
  id: z.number(),
  name: z.string(),
  server: z.string().nullable(),
  country: z.string(),
  tag: z.string().nullable(),
  homepage: z.string().nullable(),
  type: z.string(),
  steam: z.object({
    avatar: z.url(),
    steam_group: z.string().nullable(),
  }),
  irc: z.object({
    channel: z.string().nullable(),
    network: z.string().nullable(),
  }),
  competitions: z.record(z.string(), etf2lCompetitionSchema),
  urls: z.object({
    matches: z.url(),
    results: z.url(),
    self: z.url(),
    transfers: z.url(),
  }),
})
