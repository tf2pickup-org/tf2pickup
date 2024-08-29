import { z } from 'zod'

export const etf2lCompetitionSchema = z.object({
  category: z.string(),
  competition: z.string(),
  division: z.object({
    name: z.string().nullable(),
    skill_contrib: z.number().nullable(),
    tier: z.number().nullable(),
  }),
  url: z.string(),
})
