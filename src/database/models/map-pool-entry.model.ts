import { z } from 'zod'
import type { Gamemode } from '../../shared/types/gamemode'

export const mapPoolEntrySchema = z.object({
  name: z.string().trim(),
  execConfig: z.string().optional(),
  cooldown: z.number().optional(),
})

export const mapPoolSchema = z
  .array(mapPoolEntrySchema)
  .refine(maps => maps.length >= 3, 'map pool must contain at least 3 maps')

export type MapPoolEntry = z.infer<typeof mapPoolEntrySchema>

// The stored map-pool document: a validated entry plus the gamemode whose pool
// it belongs to. `mapPoolEntrySchema` stays the admin-input shape (no gamemode);
// the discriminator is attached on write.
export interface MapPoolEntryModel extends MapPoolEntry {
  gamemode: Gamemode
}
