import { MongoError } from 'mongodb'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { collections } from '../database/collections'
import { gameLogSink } from './game-log-sink'

vi.mock('../database/collections', () => ({
  collections: {
    gameLogs: {
      findOneAndUpdate: vi.fn(),
      deleteOne: vi.fn(),
    },
  },
}))

vi.mock('../utils/hide-ip-addresses', () => ({
  hideIpAddresses: (s: string) => s,
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(collections.gameLogs.findOneAndUpdate).mockResolvedValue(null)
  vi.mocked(collections.gameLogs.deleteOne).mockResolvedValue({
    acknowledged: true,
    deletedCount: 1,
  })
})

describe('push()', () => {
  it('should persist a log message with the correct fields', async () => {
    gameLogSink.push({ payload: 'hello world', password: 'push-basic' })
    await gameLogSink.waitForCompletion('push-basic')

    expect(collections.gameLogs.findOneAndUpdate).toHaveBeenCalledWith(
      { logSecret: 'push-basic' },
      { $push: { logs: 'hello world' } },
      { upsert: true },
    )
  })

  it('should process messages for the same key sequentially', async () => {
    const results: number[] = []
    const resolvers: (() => void)[] = []

    for (let i = 1; i <= 3; i++) {
      const value = i
      let resolve!: () => void
      const promise = new Promise<void>(r => {
        resolve = r
      })
      resolvers.push(resolve)

      vi.mocked(collections.gameLogs.findOneAndUpdate).mockImplementationOnce(async () => {
        await promise
        results.push(value)
        return null
      })

      gameLogSink.push({ payload: `msg${i}`, password: 'push-seq' })
    }

    // Resolve in reverse order — results should still be sequential
    resolvers[2]!()
    resolvers[1]!()
    resolvers[0]!()

    await gameLogSink.waitForCompletion('push-seq')
    expect(results).toEqual([1, 2, 3])
  })

  it('should process messages for different keys concurrently', async () => {
    const results: string[] = []
    let resolveA!: () => void
    let resolveB!: () => void

    const promiseA = new Promise<void>(r => {
      resolveA = r
    })
    const promiseB = new Promise<void>(r => {
      resolveB = r
    })

    vi.mocked(collections.gameLogs.findOneAndUpdate)
      .mockImplementationOnce(async () => {
        await promiseA
        results.push('A')
        return null
      })
      .mockImplementationOnce(async () => {
        await promiseB
        results.push('B')
        return null
      })

    gameLogSink.push({ payload: 'msgA', password: 'push-concurrent-a' })
    gameLogSink.push({ payload: 'msgB', password: 'push-concurrent-b' })

    resolveB()
    await gameLogSink.waitForCompletion('push-concurrent-b')
    expect(results).toEqual(['B'])

    resolveA()
    await gameLogSink.waitForCompletion('push-concurrent-a')
    expect(results).toEqual(['B', 'A'])
  })

  it('should retry once on MongoDB duplicate key error (11000)', async () => {
    const dupeError = new MongoError('E11000')
    dupeError.code = 11000

    vi.mocked(collections.gameLogs.findOneAndUpdate)
      .mockRejectedValueOnce(dupeError)
      .mockResolvedValueOnce(null)

    gameLogSink.push({ payload: 'hello', password: 'push-retry' })
    await gameLogSink.waitForCompletion('push-retry')

    expect(collections.gameLogs.findOneAndUpdate).toHaveBeenCalledTimes(2)
  })

  it('should not retry on MongoError with code other than 11000', async () => {
    const mongoError = new MongoError('some other error')
    mongoError.code = 13

    vi.mocked(collections.gameLogs.findOneAndUpdate).mockRejectedValueOnce(mongoError)

    gameLogSink.push({ payload: 'hello', password: 'push-no-retry' })
    await gameLogSink.waitForCompletion('push-no-retry')

    expect(collections.gameLogs.findOneAndUpdate).toHaveBeenCalledTimes(1)
  })

  it('should continue processing subsequent messages after a DB error', async () => {
    const results: string[] = []
    const mongoError = new MongoError('unexpected')
    mongoError.code = 99

    vi.mocked(collections.gameLogs.findOneAndUpdate)
      .mockRejectedValueOnce(mongoError)
      .mockImplementationOnce(async () => {
        results.push('second')
        return null
      })

    gameLogSink.push({ payload: 'first', password: 'push-error-recover' })
    gameLogSink.push({ payload: 'second', password: 'push-error-recover' })

    await gameLogSink.waitForCompletion('push-error-recover')
    expect(results).toEqual(['second'])
  })
})

describe('waitForCompletion()', () => {
  it('should resolve immediately for an unknown key', async () => {
    await gameLogSink.waitForCompletion('nonexistent-key')
  })

  it('should resolve immediately once all operations have completed', async () => {
    gameLogSink.push({ payload: 'x', password: 'wait-completed' })
    await gameLogSink.waitForCompletion('wait-completed')
    await gameLogSink.waitForCompletion('wait-completed')
  })
})

describe('clear()', () => {
  it('should delete the game log document using the correct field name', async () => {
    await gameLogSink.clear('my-secret')
    expect(collections.gameLogs.deleteOne).toHaveBeenCalledWith({ logSecret: 'my-secret' })
  })

  it('should serialize deletion between pre- and post-clear writes', async () => {
    const results: number[] = []
    let resolveFirst!: () => void
    const promiseFirst = new Promise<void>(r => {
      resolveFirst = r
    })

    vi.mocked(collections.gameLogs.findOneAndUpdate)
      .mockImplementationOnce(async () => {
        await promiseFirst
        results.push(1)
        return null
      })
      .mockImplementationOnce(async () => {
        results.push(2)
        return null
      })
    vi.mocked(collections.gameLogs.deleteOne).mockImplementationOnce(async () => {
      results.push(0)
      return { acknowledged: true, deletedCount: 1 }
    })

    gameLogSink.push({ payload: 'first', password: 'clear-chain' })
    const clear = gameLogSink.clear('clear-chain')
    gameLogSink.push({ payload: 'second', password: 'clear-chain' })

    resolveFirst()
    await clear

    await gameLogSink.waitForCompletion('clear-chain')

    expect(results).toEqual([1, 0, 2])
  })
})
