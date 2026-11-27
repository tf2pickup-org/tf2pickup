import { Mutex } from 'async-mutex'

// a mutex per key, dropped once nobody holds or awaits it
export function keyedMutex() {
  const mutexes = new Map<unknown, { mutex: Mutex; users: number }>()

  return async <T>(key: unknown, fn: () => Promise<T>): Promise<T> => {
    let entry = mutexes.get(key)
    if (entry === undefined) {
      entry = { mutex: new Mutex(), users: 0 }
      mutexes.set(key, entry)
    }
    entry.users += 1
    try {
      return await entry.mutex.runExclusive(fn)
    } finally {
      entry.users -= 1
      if (entry.users === 0) {
        mutexes.delete(key)
      }
    }
  }
}
