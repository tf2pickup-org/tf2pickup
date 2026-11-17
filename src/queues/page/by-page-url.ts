import { collections } from '../../database/collections'
import type { QueueModel } from '../../database/models/queue.model'
import { queuePageUrl } from './queue-page-url'

// The enabled queue whose page is at the given path, if any.
export async function byPageUrl(url: string | undefined): Promise<QueueModel | undefined> {
  const slug = queuePageUrl.parse(url)
  if (!slug) {
    return undefined
  }
  return (await collections.queues.findOne({ slug, enabled: true })) ?? undefined
}
