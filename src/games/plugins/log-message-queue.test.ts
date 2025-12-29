import { describe, expect, it, beforeEach } from 'vitest'
import { delay } from 'es-toolkit'
import { LogMessageQueue } from './log-message-queue'

describe('LogMessageQueue', () => {
  let queue: LogMessageQueue

  beforeEach(() => {
    queue = new LogMessageQueue()
  })

  it('should execute operations sequentially for the same key', async () => {
    const results: number[] = []

    const promises = [
      queue.enqueue('key1', async () => {
        await delay(30)
        results.push(1)
      }),
      queue.enqueue('key1', async () => {
        await delay(20)
        results.push(2)
      }),
      queue.enqueue('key1', async () => {
        await delay(10)
        results.push(3)
      }),
    ]

    await Promise.all(promises)

    expect(results).toEqual([1, 2, 3])
  })

  it('should execute operations concurrently for different keys', async () => {
    const results: string[] = []

    const promises = [
      queue.enqueue('key1', async () => {
        await delay(30)
        results.push('key1')
      }),
      queue.enqueue('key2', async () => {
        await delay(10)
        results.push('key2')
      }),
    ]

    await Promise.all(promises)

    // key2 should finish first because it has a shorter delay and runs concurrently
    expect(results).toEqual(['key2', 'key1'])
  })

  it('should propagate errors to the caller', async () => {
    const error = new Error('test error')

    await expect(
      queue.enqueue('key1', async () => {
        throw error
      }),
    ).rejects.toThrow('test error')
  })

  it('should continue processing after an error', async () => {
    const results: number[] = []

    // First operation throws an error
    await queue
      .enqueue('key1', async () => {
        throw new Error('error')
      })
      .catch(() => undefined)

    // Second operation should still execute
    await queue.enqueue('key1', async () => {
      results.push(1)
    })

    expect(results).toEqual([1])
  })

  it('should clear the queue for a specific key', async () => {
    const results: number[] = []

    // Enqueue an operation
    const promise = queue.enqueue('key1', async () => {
      await delay(10)
      results.push(1)
    })

    // Clear and immediately enqueue another
    queue.clear('key1')

    // This operation will run concurrently with the first since we cleared the chain
    const promise2 = queue.enqueue('key1', async () => {
      results.push(2)
    })

    await Promise.all([promise, promise2])

    // After clear, the second operation doesn't wait for the first
    expect(results).toEqual([2, 1])
  })

  it('should handle multiple sequential operations correctly', async () => {
    const results: number[] = []

    for (let i = 1; i <= 5; i++) {
      const value = i
      await queue.enqueue('key1', async () => {
        results.push(value)
      })
    }

    expect(results).toEqual([1, 2, 3, 4, 5])
  })

  it('should handle concurrent enqueues on the same key', async () => {
    const results: number[] = []
    const promises: Promise<void>[] = []

    // Enqueue 10 operations at once
    for (let i = 1; i <= 10; i++) {
      const value = i
      promises.push(
        queue.enqueue('key1', async () => {
          await delay(Math.random() * 5)
          results.push(value)
        }),
      )
    }

    await Promise.all(promises)

    // Despite random delays, order should be preserved
    expect(results).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })
})
