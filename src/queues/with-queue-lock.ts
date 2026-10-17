import { Mutex } from 'async-mutex'
import { performance } from 'node:perf_hooks'
import { collections } from '../database/collections'
import type { QueueId } from '../database/models/queue.model'
import { queueMutexWaitDuration } from './metrics'

const mutexes = new Map<string, Mutex>()
// slugs never change, so each is looked up once for the metric attribute
const slugs = new Map<string, string>()

async function slugOf(key: string, queue: QueueId) {
  let slug = slugs.get(key)
  if (slug === undefined) {
    const found = await collections.queues.findOne({ _id: queue }, { projection: { slug: 1 } })
    slug = found?.slug ?? key
    slugs.set(key, slug)
  }
  return slug
}

export async function withQueueLock<T>(
  queue: QueueId,
  operation: string,
  fn: () => Promise<T>,
): Promise<T> {
  const key = queue.toHexString()
  let mutex = mutexes.get(key)
  if (!mutex) {
    mutex = new Mutex()
    mutexes.set(key, mutex)
  }

  const slug = await slugOf(key, queue)
  const waitStart = performance.now()
  return mutex.runExclusive(async () => {
    queueMutexWaitDuration.record(performance.now() - waitStart, { operation, queue: slug })
    return fn()
  })
}
