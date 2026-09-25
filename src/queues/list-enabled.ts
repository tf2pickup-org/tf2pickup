import { collections } from '../database/collections'
import type { QueueModel } from '../database/models/queue.model'

export async function listEnabled(): Promise<QueueModel[]> {
  return await collections.queues.find({ enabled: true }, { sort: { position: 1 } }).toArray()
}
