import { z } from 'zod'

export const banExpiryFormSchema = z.discriminatedUnion('lengthSelector', [
  z.object({
    lengthSelector: z.literal('duration'),
    duration: z.coerce.number(),
    durationUnits: z.enum(['minutes', 'hours', 'days', 'weeks', 'months', 'years']),
  }),
  z.object({
    lengthSelector: z.literal('date'),
    date: z.iso.datetime({ local: true }),
  }),
  z.object({
    lengthSelector: z.literal('forever'),
  }),
])
