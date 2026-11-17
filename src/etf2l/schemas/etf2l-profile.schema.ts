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
        reason: z.string().transform(unescapeHtml),
      }),
    )
    .nullable(),
})

const htmlEntities: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#039;': "'",
}

function unescapeHtml(value: string) {
  return value.replace(/&(?:amp|lt|gt|quot|#0?39);/g, entity => htmlEntities[entity]!)
}
