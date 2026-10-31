import { collections } from '../database/collections'
import type { QueueModel } from '../database/models/queue.model'

export async function playerCounts(queue: Pick<QueueModel, '_id'>) {
  const [current, required] = await Promise.all([
    collections.queueSlots.countDocuments({ queue: queue._id, player: { $ne: null } }),
    collections.queueSlots.countDocuments({ queue: queue._id }),
  ])
  return { current, required }
}
