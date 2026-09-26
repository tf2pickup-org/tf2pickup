import { collections } from '../database/collections'
import type { QueueModel } from '../database/models/queue.model'
import { errors } from '../errors'

export async function bySlug(slug: string): Promise<QueueModel> {
  const queue = await collections.queues.findOne({ slug })
  if (!queue) {
    throw errors.notFound(`queue ${slug} does not exist`)
  }
  return queue
}
