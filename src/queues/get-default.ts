import { collections } from '../database/collections'
import type { QueueModel } from '../database/models/queue.model'
import { errors } from '../errors'

// The queue served at the root of the site.
export async function getDefault(): Promise<QueueModel> {
  const queue = await collections.queues.findOne({ enabled: true }, { sort: { position: 1 } })
  if (!queue) {
    throw errors.internalServerError('no queue is enabled')
  }
  return queue
}
