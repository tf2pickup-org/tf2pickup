import { collections } from '../../database/collections'
import type { MapPoolEntry } from '../../database/models/map-pool-entry.model'

export async function get(): Promise<MapPoolEntry[]> {
  return await collections.maps.find({}).toArray()
}
