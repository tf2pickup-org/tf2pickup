import { collections } from '../database/collections'

export async function up() {
  await collections.queueSlots.deleteMany({})
}
