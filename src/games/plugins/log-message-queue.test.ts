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
    let resolve3: () => void

    const allDone = new Promise<void>(resolve => {
      resolve3 = resolve
    })

    queue.enqueue('key1', async () => {
      await delay(30)
      results.push(1)
    })
    queue.enqueue('key1', async () => {
      await delay(20)
      results.push(2)
    })
    queue.enqueue('key1', async () => {
      await delay(10)
      results.push(3)
      resolve3()
    })

    await allDone

    expect(results).toEqual([1, 2, 3])
  })

  it('should execute operations concurrently for different keys', async () => {
    const results: string[] = []
    let completed = 0
    let resolveAll: () => void

    const allDone = new Promise<void>(resolve => {
      resolveAll = resolve
    })

    const checkDone = () => {
      completed++
      if (completed === 2) resolveAll()
    }

    queue.enqueue('key1', async () => {
      await delay(30)
      results.push('key1')
      checkDone()
    })
    queue.enqueue('key2', async () => {
      await delay(10)
      results.push('key2')
      checkDone()
    })

    await allDone

    // key2 should finish first because it has a shorter delay and runs concurrently
    expect(results).toEqual(['key2', 'key1'])
  })

  it('should continue processing after an error', async () => {
    const results: number[] = []
    let resolveDone: () => void

    const done = new Promise<void>(resolve => {
      resolveDone = resolve
    })

    // First operation throws an error
    queue.enqueue('key1', async () => {
      throw new Error('error')
    })

    // Second operation should still execute
    queue.enqueue('key1', async () => {
      results.push(1)
      resolveDone()
    })

    await done

    expect(results).toEqual([1])
  })

  it('should clear the queue for a specific key', async () => {
    const results: number[] = []
    let completed = 0
    let resolveAll: () => void

    const allDone = new Promise<void>(resolve => {
      resolveAll = resolve
    })

    const checkDone = () => {
      completed++
      if (completed === 2) resolveAll()
    }

    // Enqueue an operation
    queue.enqueue('key1', async () => {
      await delay(20)
      results.push(1)
      checkDone()
    })

    // Clear and immediately enqueue another
    queue.clear('key1')

    // This operation will run concurrently with the first since we cleared the chain
    queue.enqueue('key1', async () => {
      results.push(2)
      checkDone()
    })

    await allDone

    // After clear, the second operation doesn't wait for the first
    expect(results).toEqual([2, 1])
  })

  it('should handle multiple sequential operations correctly', async () => {
    const results: number[] = []
    let resolveDone: () => void

    const done = new Promise<void>(resolve => {
      resolveDone = resolve
    })

    for (let i = 1; i <= 5; i++) {
      const value = i
      queue.enqueue('key1', async () => {
        results.push(value)
        if (value === 5) resolveDone()
      })
    }

    await done

    expect(results).toEqual([1, 2, 3, 4, 5])
  })

  it('should handle concurrent enqueues on the same key', async () => {
    const results: number[] = []
    let resolveDone: () => void

    const done = new Promise<void>(resolve => {
      resolveDone = resolve
    })

    // Enqueue 10 operations at once
    for (let i = 1; i <= 10; i++) {
      const value = i
      queue.enqueue('key1', async () => {
        await delay(Math.random() * 5)
        results.push(value)
        if (value === 10) resolveDone()
      })
    }

    await done

    // Despite random delays, order should be preserved
    expect(results).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('should return nothing', () => {
    const result = queue.enqueue('key1', async () => {
      await delay(100)
    })

    expect(result).toBeUndefined()
  })

  describe('waitForCompletion', () => {
    it('should wait for all enqueued operations to complete', async () => {
      const results: number[] = []

      queue.enqueue('key1', async () => {
        await delay(20)
        results.push(1)
      })
      queue.enqueue('key1', async () => {
        await delay(10)
        results.push(2)
      })

      expect(results).toEqual([])

      await queue.waitForCompletion('key1')

      expect(results).toEqual([1, 2])
    })

    it('should resolve immediately if no operations are pending', async () => {
      const start = Date.now()
      await queue.waitForCompletion('nonexistent-key')
      const elapsed = Date.now() - start

      expect(elapsed).toBeLessThan(10)
    })

    it('should resolve immediately if all operations have completed', async () => {
      let resolveDone: () => void
      const done = new Promise<void>(resolve => {
        resolveDone = resolve
      })

      queue.enqueue('key1', async () => {
        resolveDone()
      })

      await done
      // Small delay to ensure the queue has processed
      await delay(5)

      const start = Date.now()
      await queue.waitForCompletion('key1')
      const elapsed = Date.now() - start

      expect(elapsed).toBeLessThan(10)
    })

    it('should only wait for operations on the specified key', async () => {
      const results: string[] = []

      queue.enqueue('key1', async () => {
        await delay(50)
        results.push('key1')
      })
      queue.enqueue('key2', async () => {
        await delay(10)
        results.push('key2')
      })

      await queue.waitForCompletion('key2')

      // key2 should be done, key1 might still be running
      expect(results).toContain('key2')
    })
  })
})
