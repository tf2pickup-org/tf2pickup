import { collections } from '../database/collections'
import type { QueueId, QueueModel } from '../database/models/queue.model'
import { errors } from '../errors'

export async function get(id: QueueId): Promise<QueueModel> {
  const queue = await collections.queues.findOne({ _id: id })
  if (!queue) {
    throw errors.notFound(`queue ${id.toHexString()} does not exist`)
  }
  return queue
}
