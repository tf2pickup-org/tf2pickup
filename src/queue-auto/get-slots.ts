import { collections } from '../database/collections'
import type { QueueSlotModel } from '../database/models/queue-slot.model'

export async function getSlots(): Promise<QueueSlotModel[]> {
  return await collections.queueSlots.find().toArray()
}
