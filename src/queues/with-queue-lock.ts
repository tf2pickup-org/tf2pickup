import { Mutex } from 'async-mutex'
import { performance } from 'node:perf_hooks'
import type { QueueId } from '../database/models/queue.model'
import { queueMutexWaitDuration } from './metrics'

const mutexes = new Map<string, Mutex>()

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

  const waitStart = performance.now()
  return mutex.runExclusive(async () => {
    queueMutexWaitDuration.record(performance.now() - waitStart, { operation })
    return fn()
  })
}
