import { collections } from '../database/collections'
import { reset } from './reset'

const slotCount = await collections.queueSlots.countDocuments()
if (slotCount === 0) {
  await reset()
}
