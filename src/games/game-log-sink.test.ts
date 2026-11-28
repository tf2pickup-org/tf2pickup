import { MongoError } from 'mongodb'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { collections } from '../database/collections'
import { gameLogSink } from './game-log-sink'

vi.mock('../database/collections', () => ({
  collections: {
    gameLogs: {
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    },
  },
}))

vi.mock('../utils/hide-ip-addresses', () => ({
  hideIpAddresses: (s: string) => s,
}))

const updateResult = {
  acknowledged: true,
  matchedCount: 1,
  modifiedCount: 1,
  upsertedCount: 0,
  upsertedId: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(collections.gameLogs.updateOne).mockResolvedValue(updateResult)
  vi.mocked(collections.gameLogs.deleteOne).mockResolvedValue({
    acknowledged: true,
    deletedCount: 1,
  })
})

describe('push()', () => {
  it('should persist a log message with the correct fields', async () => {
    gameLogSink.push({ payload: 'hello world', password: 'push-basic' })
    await gameLogSink.waitForCompletion('push-basic')

    expect(collections.gameLogs.updateOne).toHaveBeenCalledWith(
      { logSecret: 'push-basic' },
      { $push: { logs: 'hello world' } },
      { upsert: true },
    )
  })

  it('should process messages for the same key sequentially', async () => {
    const first = deferred()
    vi.mocked(collections.gameLogs.updateOne).mockImplementationOnce(async () => {
      await first.promise
      return updateResult
    })

    gameLogSink.push({ payload: 'msg1', password: 'push-seq' })
    gameLogSink.push({ payload: 'msg2', password: 'push-seq' })
    gameLogSink.push({ payload: 'msg3', password: 'push-seq' })

    await flush()
    expect(writes()).toEqual([['push-seq', 'msg1']])

    first.resolve()
    await gameLogSink.waitForCompletion('push-seq')
    expect(writes()).toEqual([
      ['push-seq', 'msg1'],
      ['push-seq', 'msg2'],
      ['push-seq', 'msg3'],
    ])
  })

  it('should process messages for different keys concurrently', async () => {
    const a = deferred()
    vi.mocked(collections.gameLogs.updateOne).mockImplementation(async filter => {
      if (filter.logSecret === 'push-concurrent-a') {
        await a.promise
      }
      return updateResult
    })

    let aDone = false
    gameLogSink.push({ payload: 'msgA', password: 'push-concurrent-a' })
    void gameLogSink.waitForCompletion('push-concurrent-a').then(() => {
      aDone = true
    })
    gameLogSink.push({ payload: 'msgB', password: 'push-concurrent-b' })

    await gameLogSink.waitForCompletion('push-concurrent-b')
    expect(aDone).toBe(false)
    expect(writes()).toEqual([
      ['push-concurrent-a', 'msgA'],
      ['push-concurrent-b', 'msgB'],
    ])

    a.resolve()
    await gameLogSink.waitForCompletion('push-concurrent-a')
    expect(aDone).toBe(true)
  })

  it('should retry once on MongoDB duplicate key error (11000)', async () => {
    const dupeError = new MongoError('E11000')
    dupeError.code = 11000

    vi.mocked(collections.gameLogs.updateOne)
      .mockRejectedValueOnce(dupeError)
      .mockResolvedValueOnce(updateResult)

    gameLogSink.push({ payload: 'hello', password: 'push-retry' })
    await gameLogSink.waitForCompletion('push-retry')

    expect(writes()).toEqual([
      ['push-retry', 'hello'],
      ['push-retry', 'hello'],
    ])
  })

  it('should not retry on MongoError with code other than 11000', async () => {
    const mongoError = new MongoError('some other error')
    mongoError.code = 13

    vi.mocked(collections.gameLogs.updateOne).mockRejectedValueOnce(mongoError)

    gameLogSink.push({ payload: 'hello', password: 'push-no-retry' })
    await gameLogSink.waitForCompletion('push-no-retry')

    expect(writes()).toEqual([['push-no-retry', 'hello']])
  })

  it('should continue processing subsequent messages after a DB error', async () => {
    const mongoError = new MongoError('unexpected')
    mongoError.code = 99

    vi.mocked(collections.gameLogs.updateOne).mockRejectedValueOnce(mongoError)

    gameLogSink.push({ payload: 'first', password: 'push-error-recover' })
    gameLogSink.push({ payload: 'second', password: 'push-error-recover' })

    await gameLogSink.waitForCompletion('push-error-recover')
    expect(writes()).toEqual([
      ['push-error-recover', 'first'],
      ['push-error-recover', 'second'],
    ])
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
    const first = deferred()
    const deletion = deferred()

    vi.mocked(collections.gameLogs.updateOne).mockImplementationOnce(async () => {
      await first.promise
      return updateResult
    })
    vi.mocked(collections.gameLogs.deleteOne).mockImplementationOnce(async () => {
      await deletion.promise
      return { acknowledged: true, deletedCount: 1 }
    })

    gameLogSink.push({ payload: 'first', password: 'clear-chain' })
    const clear = gameLogSink.clear('clear-chain')
    gameLogSink.push({ payload: 'second', password: 'clear-chain' })

    await flush()
    expect(writes()).toEqual([['clear-chain', 'first']])
    expect(collections.gameLogs.deleteOne).toHaveBeenCalledTimes(0)

    first.resolve()
    await flush()
    expect(collections.gameLogs.deleteOne).toHaveBeenCalledWith({ logSecret: 'clear-chain' })
    expect(writes()).toEqual([['clear-chain', 'first']])

    deletion.resolve()
    await clear
    await gameLogSink.waitForCompletion('clear-chain')
    expect(writes()).toEqual([
      ['clear-chain', 'first'],
      ['clear-chain', 'second'],
    ])
  })
})

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>(r => {
    resolve = r
  })
  return { promise, resolve }
}

function flush() {
  return new Promise<void>(r => setImmediate(r))
}

function writes() {
  return vi.mocked(collections.gameLogs.updateOne).mock.calls.map(([filter, update, options]) => {
    expect(options).toEqual({ upsert: true })
    return [filter.logSecret, logLine(update)]
  })
}

function logLine(update: unknown) {
  return (update as { $push: { logs: string } }).$push.logs
}
