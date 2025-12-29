import { describe, expect, it, vi } from 'vitest'
import { EventEmitter } from 'node:events'

const testEvents = new EventEmitter()

const findOneAndUpdate = vi.fn()
const deleteOne = vi.fn()

vi.mock('../../events', () => ({
  events: testEvents,
}))

vi.mock('../../database/collections', () => ({
  collections: {
    gameLogs: {
      findOneAndUpdate,
      deleteOne,
    },
  },
}))

describe('game log collector', () => {
  it('serializes db writes per logSecret to preserve log order', async () => {
    // Arrange: each db write stays pending until we resolve it.
    const resolvers: (() => void)[] = []
    let inFlight = 0

    findOneAndUpdate.mockImplementation(() => {
      inFlight += 1
      // if this ever exceeds 1, we are doing concurrent writes (ordering becomes non-deterministic)
      expect(inFlight).toBe(1)

      return new Promise<void>(resolve => {
        resolvers.push(() => {
          inFlight -= 1
          resolve()
        })
      })
    })

    // Load the plugin (registers event listener on our mocked emitter).
    const { default: plugin } = await import('./game-log-collector')
    await (plugin as unknown as (app: unknown, opts: unknown) => Promise<void>)({}, {})

    // Act: emit a burst of log lines without awaiting.
    const logSecret = 'secret'
    for (let i = 0; i < 25; i += 1) {
      testEvents.emit('gamelog:message', {
        message: { password: logSecret, payload: `line-${i}` },
      })
    }

    // Assert: only the first write should have started so far.
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(findOneAndUpdate).toHaveBeenCalledTimes(1)

    // Complete writes one-by-one and ensure no overlap happens.
    for (let i = 0; i < 25; i += 1) {
      resolvers[i]!()
      // allow the queued next write to start
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(findOneAndUpdate).toHaveBeenCalledTimes(Math.min(i + 2, 25))
    }
  })
})
