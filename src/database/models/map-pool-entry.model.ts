import { z } from 'zod'
import { Gamemode } from '../../shared/types/gamemode'

export const mapPoolEntrySchema = z.object({
  gamemode: z.enum(Gamemode).optional(),
  name: z.string(),
  execConfig: z.string().optional(),
  cooldown: z.number().optional(),
})

export const mapPoolSchema = z
  .array(mapPoolEntrySchema)
  .refine(maps => maps.length >= 3, 'map pool must contain at least 3 maps')

export type MapPoolEntry = z.infer<typeof mapPoolEntrySchema>
