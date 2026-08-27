import { collections } from '../database/collections'
import type { QueueSlotModel } from '../database/models/queue-slot.model'
import type { Gamemode } from '../shared/types/gamemode'

export async function getSlots(gamemode: Gamemode): Promise<QueueSlotModel[]> {
  return await collections.queueSlots.find({ gamemode }).toArray()
}
