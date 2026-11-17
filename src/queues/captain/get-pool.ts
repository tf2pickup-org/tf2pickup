import { collections } from '../../database/collections'
import type { CaptainPoolModel } from '../../database/models/captain-pool.model'
import type { QueueId } from '../../database/models/queue.model'

// longest-waiting first
export async function getPool(queue: QueueId): Promise<CaptainPoolModel[]> {
  return await collections.captainPool.find({ queue }, { sort: { joinedAt: 1 } }).toArray()
}
