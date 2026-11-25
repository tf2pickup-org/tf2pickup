import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ObjectId } from 'mongodb'
import type { GameModel } from '../../database/models/game.model'
import type { QueueId } from '../../database/models/queue.model'
import { collections } from '../../database/collections'
import { applyMapCooldown } from '../../maps/apply-cooldown'
import { preReady } from '../../pre-ready'
import { tasks } from '../../tasks'
import { captainDraftMetrics } from './metrics'
import { completeLaunch } from './complete-launch'
import { launchFailed } from './launch-failed'
const store = vi.hoisted(() => ({ phase: 'launching', mode: 'captain', token: 't' }))
vi.mock('../../database/collections', () => ({
  collections: {
    captainDrafts: {
      findOne: vi.fn(() =>
        Promise.resolve({ token: store.token, startedAt: new Date(Date.now() - 1500) }),
      ),
      deleteMany: vi.fn(),
    },
    captainPool: {
      find: vi.fn(() => ({
        toArray: () =>
          Promise.resolve([{ player: { steamId: 'red' } }, { player: { steamId: 'blu' } }]),
      })),
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
    },
    queueState: {
      findOne: vi.fn(() => Promise.resolve({ state: store.phase })),
      updateOne: vi.fn(),
    },
  },
}))
vi.mock('../get', () => ({
  get: vi.fn((queue: unknown) => Promise.resolve({ _id: queue, launchMode: store.mode })),
}))
vi.mock('../queue-command', () => ({
  queueCommand: vi.fn(async (_operation: string, fn: (emit: unknown) => unknown) => await fn(emit)),
}))
vi.mock('../../pre-ready', () => ({ preReady: { cancel: vi.fn() } }))
vi.mock('../../maps/apply-cooldown', () => ({ applyMapCooldown: vi.fn() }))
vi.mock('../../logger', () => ({ logger: { info: vi.fn() } }))
vi.mock('../../tasks', () => ({ tasks: { cancel: vi.fn() } }))
vi.mock('./metrics', () => ({
  captainDraftMetrics: { duration: { record: vi.fn() }, aborted: { add: vi.fn() } },
}))
const emit = vi.fn()
const queue = new ObjectId() as QueueId
const game = {
  queue,
  launchMode: 'captain',
  launchToken: 't',
  map: 'cp_a',
  slots: [{ player: 'red' }, { player: 'blu' }],
} as GameModel
beforeEach(() => {
  vi.clearAllMocks()
  store.phase = 'launching'
  store.mode = 'captain'
  store.token = 't'
})

describe('captain launch lifecycle', () => {
  it('removes only drafted players, preserves other signup fields, and re-evaluates readiness', async () => {
    await completeLaunch(game)
    expect(applyMapCooldown).toHaveBeenCalledExactlyOnceWith(queue, 'cp_a')
    expect(collections.captainPool.deleteMany).toHaveBeenCalledWith({
      queue,
      'player.steamId': { $in: ['red', 'blu'] },
    })
    expect(collections.captainPool.updateMany).toHaveBeenCalledWith(
      { queue },
      { $set: { locked: false, ready: false } },
    )
    expect(collections.captainDrafts.deleteMany).toHaveBeenCalledWith({ queue })
    expect(tasks.cancel).toHaveBeenCalledWith('queue/captain:turnTimeout', { queue })
    expect(emit).toHaveBeenCalledWith('queue/state:updated', { queue, state: 'waiting' })
    expect(captainDraftMetrics.duration.record).toHaveBeenCalledWith(expect.any(Number))
    expect(vi.mocked(captainDraftMetrics.duration.record).mock.calls[0]![0]).toBeGreaterThanOrEqual(
      1.5,
    )
  })

  it('returns everybody after creation failure without applying map cooldown', async () => {
    await launchFailed(queue, 't')
    expect(collections.captainPool.deleteMany).not.toHaveBeenCalled()
    expect(applyMapCooldown).not.toHaveBeenCalled()
    expect(preReady.cancel).toHaveBeenCalledWith('red')
    expect(preReady.cancel).toHaveBeenCalledWith('blu')
    expect(preReady.cancel).toHaveBeenCalledTimes(2)
    expect(collections.captainPool.find).toHaveBeenCalledWith({ queue, locked: true })
    expect(collections.captainPool.updateMany).toHaveBeenCalledWith(
      { queue },
      { $set: { locked: false, ready: false } },
    )
    expect(captainDraftMetrics.aborted.add).toHaveBeenCalledWith(1, { reason: 'launch_failed' })
    expect(emit).toHaveBeenCalledWith('queue/state:updated', { queue, state: 'waiting' })
  })
  it.each(['auto mode', 'stale token', 'stale phase'])(
    'ignores completion/failure for %s',
    async condition => {
      if (condition === 'auto mode') store.mode = 'auto'
      if (condition === 'stale token') store.token = 'new-draft'
      if (condition === 'stale phase') store.phase = 'drafting'
      await completeLaunch(game)
      await launchFailed(queue, 't')
      expect(applyMapCooldown).not.toHaveBeenCalled()
      expect(collections.captainPool.updateMany).not.toHaveBeenCalled()
    },
  )
})
