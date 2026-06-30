import { collections } from '../../database/collections'
import { mapPoolSchema, type MapPoolEntry } from '../../database/models/map-pool-entry.model'
import { events } from '../../events'
import type { Gamemode } from '../../shared/types/gamemode'
import { get } from './get'

/**
 * @throws {ZodError<MapPoolEntry>}
 */
export async function set(gamemode: Gamemode, maps: MapPoolEntry[]): Promise<MapPoolEntry[]> {
  const scoped = maps.map(map => ({ ...map, gamemode }))
  mapPoolSchema.parse(scoped)
  await collections.maps.deleteMany({ gamemode })
  await collections.maps.insertMany(scoped)
  const ret = await get(gamemode)
  events.emit('queue/mapPool:reset', { maps: ret })
  return ret
}
