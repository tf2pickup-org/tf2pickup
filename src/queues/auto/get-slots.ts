import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import type { QueueSlotModel } from '../../database/models/queue-slot.model'

export async function getSlots(queue: QueueId): Promise<QueueSlotModel[]> {
  return await collections.queueSlots.find({ queue }, { sort: { _id: 1 } }).toArray()
}
