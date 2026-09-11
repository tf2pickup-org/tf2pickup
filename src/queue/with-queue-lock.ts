import { Mutex } from 'async-mutex'
import { performance } from 'node:perf_hooks'
import { queueMutexWaitDuration } from './metrics'
import type { Gamemode } from '../shared/types/gamemode'

const mutexes = new Map<Gamemode, Mutex>()

function mutexFor(gamemode: Gamemode): Mutex {
  let mutex = mutexes.get(gamemode)
  if (!mutex) {
    mutex = new Mutex()
    mutexes.set(gamemode, mutex)
  }
  return mutex
}

export async function withQueueLock<T>(
  gamemode: Gamemode,
  operation: string,
  fn: () => Promise<T>,
): Promise<T> {
  const waitStart = performance.now()
  return mutexFor(gamemode).runExclusive(async () => {
    queueMutexWaitDuration.record(performance.now() - waitStart, { operation })
    return fn()
  })
}
