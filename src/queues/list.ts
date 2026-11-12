import { collections } from '../database/collections'
import type { QueueModel } from '../database/models/queue.model'

export async function list(): Promise<QueueModel[]> {
  return await collections.queues.find({}, { sort: { position: 1 } }).toArray()
}
