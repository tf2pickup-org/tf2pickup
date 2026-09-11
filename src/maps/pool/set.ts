import { collections } from '../../database/collections'
import { mapPoolSchema, type MapPoolEntry } from '../../database/models/map-pool-entry.model'
import { events } from '../../events'
import { defaultGamemode } from '../../shared/default-gamemode'
import { get } from './get'

/**
 * @throws {ZodError<MapPoolEntry>}
 */
export async function set(maps: MapPoolEntry[]): Promise<MapPoolEntry[]> {
  const parsed = mapPoolSchema.parse(maps)
  await collections.maps.deleteMany()
  await collections.maps.insertMany(parsed.map(entry => ({ ...entry, gamemode: defaultGamemode })))
  const ret = await get()
  events.emit('queue/mapPool:reset', { maps: ret })
  return ret
}
