import { collections } from '../database/collections'
import { reset } from './reset'

export async function initialize() {
  const slotCount = await collections.queueSlots.countDocuments()
  if (slotCount === 0) {
    await reset()
  }
}
