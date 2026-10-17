import { collections } from '../../database/collections'
import { mapPoolSchema, type MapPoolEntry } from '../../database/models/map-pool-entry.model'
import type { QueueId } from '../../database/models/queue.model'
import { events } from '../../events'

/**
 * @throws {ZodError<MapPoolEntry>}
 */
export async function set(queue: QueueId, maps: MapPoolEntry[]): Promise<MapPoolEntry[]> {
  const parsed = mapPoolSchema.parse(maps)
  await collections.queues.updateOne({ _id: queue }, { $set: { maps: parsed } })
  events.emit('queue/mapPool:reset', { queue, maps: parsed })
  return parsed
}
