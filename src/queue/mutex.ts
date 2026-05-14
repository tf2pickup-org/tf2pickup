import { Mutex } from 'async-mutex'
import { performance } from 'perf_hooks'
import { queueMutexWaitDuration } from './metrics'

const mutex = new Mutex()

export async function withQueueLock<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  const waitStart = performance.now()
  return mutex.runExclusive(async () => {
    queueMutexWaitDuration.record((performance.now() - waitStart) / 1000, { operation })
    return fn()
  })
}
