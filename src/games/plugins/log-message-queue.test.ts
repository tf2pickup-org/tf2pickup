import { describe, expect, it, beforeEach } from 'vitest'
import { LogMessageQueue } from './log-message-queue'

describe('LogMessageQueue', () => {
  let queue: LogMessageQueue

  beforeEach(() => {
    queue = new LogMessageQueue()
  })

  it('should execute operations sequentially for the same key', async () => {
    const results: number[] = []
    const resolvers: (() => void)[] = []

    // Create 3 operations that we control when they complete
    for (let i = 1; i <= 3; i++) {
      const value = i
      let resolve: () => void
      const promise = new Promise<void>(r => {
        resolve = r
      })
      resolvers.push(resolve!)

      queue.enqueue('key1', async () => {
        await promise
        results.push(value)
      })
    }

    // Resolve in reverse order - but results should still be sequential
    resolvers[2]!()
    resolvers[1]!()
    resolvers[0]!()

    await queue.waitForCompletion('key1')

    expect(results).toEqual([1, 2, 3])
  })

  it('should execute operations concurrently for different keys', async () => {
    const results: string[] = []
    let resolveKey1: () => void
    let resolveKey2: () => void

    const promiseKey1 = new Promise<void>(r => {
      resolveKey1 = r
    })
    const promiseKey2 = new Promise<void>(r => {
      resolveKey2 = r
    })

    queue.enqueue('key1', async () => {
      await promiseKey1
      results.push('key1')
    })
    queue.enqueue('key2', async () => {
      await promiseKey2
      results.push('key2')
    })

    // Resolve key2 first
    resolveKey2!()
    await queue.waitForCompletion('key2')

    // key2 should finish first because different keys run concurrently
    expect(results).toEqual(['key2'])

    resolveKey1!()
    await queue.waitForCompletion('key1')

    expect(results).toEqual(['key2', 'key1'])
  })

  it('should continue processing after an error', async () => {
    const results: number[] = []

    queue.enqueue('key1', async () => {
      throw new Error('error')
    })

    queue.enqueue('key1', async () => {
      results.push(1)
    })

    await queue.waitForCompletion('key1')

    expect(results).toEqual([1])
  })

  it('should clear the queue for a specific key', async () => {
    const results: number[] = []
    let resolveFirst: () => void
    let resolveSecond: () => void

    const promiseFirst = new Promise<void>(r => {
      resolveFirst = r
    })
    const promiseSecond = new Promise<void>(r => {
      resolveSecond = r
    })

    queue.enqueue('key1', async () => {
      await promiseFirst
      results.push(1)
    })

    // Clear the queue chain
    queue.clear('key1')

    // This operation starts a new chain, doesn't wait for the first
    queue.enqueue('key1', async () => {
      await promiseSecond
      results.push(2)
    })

    // Resolve second first - it should complete before first since chain was cleared
    resolveSecond!()
    await queue.waitForCompletion('key1')

    expect(results).toEqual([2])

    // Now resolve first
    resolveFirst!()
    // Give it a tick to complete
    await Promise.resolve()

    expect(results).toEqual([2, 1])
  })

  it('should handle multiple sequential operations correctly', async () => {
    const results: number[] = []

    for (let i = 1; i <= 5; i++) {
      const value = i
      queue.enqueue('key1', async () => {
        results.push(value)
      })
    }

    await queue.waitForCompletion('key1')

    expect(results).toEqual([1, 2, 3, 4, 5])
  })

  it('should handle concurrent enqueues on the same key', async () => {
    const results: number[] = []
    const resolvers: (() => void)[] = []

    // Enqueue 10 operations at once
    for (let i = 1; i <= 10; i++) {
      const value = i
      let resolve: () => void
      const promise = new Promise<void>(r => {
        resolve = r
      })
      resolvers.push(resolve!)

      queue.enqueue('key1', async () => {
        await promise
        results.push(value)
      })
    }

    // Resolve in random order
    const order = [5, 2, 8, 1, 9, 3, 7, 4, 6, 10]
    for (const i of order) {
      resolvers[i - 1]!()
    }

    await queue.waitForCompletion('key1')

    // Despite random resolution order, results should be sequential
    expect(results).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('should return nothing', () => {
    const result = queue.enqueue('key1', () => Promise.resolve())

    expect(result).toBeUndefined()
  })

  describe('waitForCompletion', () => {
    it('should wait for all enqueued operations to complete', async () => {
      const results: number[] = []
      let resolve1: () => void
      let resolve2: () => void

      const promise1 = new Promise<void>(r => {
        resolve1 = r
      })
      const promise2 = new Promise<void>(r => {
        resolve2 = r
      })

      queue.enqueue('key1', async () => {
        await promise1
        results.push(1)
      })
      queue.enqueue('key1', async () => {
        await promise2
        results.push(2)
      })

      expect(results).toEqual([])

      // Start waiting, then resolve
      const waitPromise = queue.waitForCompletion('key1')
      resolve1!()
      resolve2!()

      await waitPromise

      expect(results).toEqual([1, 2])
    })

    it('should resolve immediately if no operations are pending', async () => {
      await queue.waitForCompletion('nonexistent-key')
      // If we get here without hanging, the test passes
      expect(true).toBe(true)
    })

    it('should resolve immediately if all operations have completed', async () => {
      queue.enqueue('key1', () => Promise.resolve())

      await queue.waitForCompletion('key1')

      // Second wait should resolve immediately
      await queue.waitForCompletion('key1')
      expect(true).toBe(true)
    })

    it('should only wait for operations on the specified key', async () => {
      const results: string[] = []
      let resolveKey1: () => void
      let resolveKey2: () => void

      const promiseKey1 = new Promise<void>(r => {
        resolveKey1 = r
      })
      const promiseKey2 = new Promise<void>(r => {
        resolveKey2 = r
      })

      queue.enqueue('key1', async () => {
        await promiseKey1
        results.push('key1')
      })
      queue.enqueue('key2', async () => {
        await promiseKey2
        results.push('key2')
      })

      // Resolve and wait for key2 only
      resolveKey2!()
      await queue.waitForCompletion('key2')

      expect(results).toEqual(['key2'])

      // key1 is still pending
      resolveKey1!()
      await queue.waitForCompletion('key1')

      expect(results).toEqual(['key2', 'key1'])
    })
  })
})
