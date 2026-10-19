import type { MapPoolEntry } from '../../database/models/map-pool-entry.model'
import type { QueueId } from '../../database/models/queue.model'
import { get as getQueue } from '../../queues/get'

export async function get(queue: QueueId): Promise<MapPoolEntry[]> {
  return (await getQueue(queue)).maps
}
