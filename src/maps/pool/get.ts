import { collections } from '../../database/collections'
import type { MapPoolEntry } from '../../database/models/map-pool-entry.model'
import type { Gamemode } from '../../shared/types/gamemode'

export async function get(gamemode: Gamemode): Promise<MapPoolEntry[]> {
  return await collections.maps.find({ gamemode }).toArray()
}
