import { beforeEach, describe, expect, it, vi } from 'vitest'

const store = vi.hoisted(() => ({
  state: 'drafting' as string | undefined,
  draft: undefined as
    | {
        turnDeadline: Date
        token: string
        turn: number
        mapOptions: string[]
        bans: { map: string }[]
      }
    | undefined,
}))

vi.mock('../../database/collections', () => ({
  collections: {
    queueState: {
      findOne: vi.fn(() => Promise.resolve(store.state ? { state: store.state } : null)),
    },
    games: { findOne: vi.fn() },
    captainDrafts: { findOne: vi.fn(() => Promise.resolve(store.draft ?? null)) },
  },
}))
vi.mock('./begin-map-bans', () => ({ beginMapBans: vi.fn() }))
vi.mock('./settle-map-bans', () => ({ settleMapBans: vi.fn() }))
vi.mock('./get-pool', () => ({ getPool: vi.fn().mockResolvedValue([]) }))
vi.mock('./build-launch-snapshot', () => ({
  buildLaunchSnapshot: vi.fn().mockReturnValue({ token: 't' }),
}))
vi.mock('../../logger', () => ({ logger: { info: vi.fn() } }))
vi.mock('../../tasks', () => ({ tasks: { cancel: vi.fn(), schedule: vi.fn() } }))
vi.mock('../auto/queue-command', () => ({
  queueCommand: vi.fn(async (_operation: string, fn: (emit: unknown) => unknown) => await fn(emit)),
}))

import { addSeconds, secondsToMilliseconds, subSeconds } from 'date-fns'
import { ObjectId } from 'mongodb'
import type { QueueModel } from '../../database/models/queue.model'
import { collections } from '../../database/collections'
import { tasks } from '../../tasks'
import { beginMapBans } from './begin-map-bans'
import { settleMapBans } from './settle-map-bans'
import { recoverDraft } from './recover-draft'

const emit = vi.fn()

const queue = { _id: new ObjectId(), launchMode: 'captain' } as unknown as QueueModel

beforeEach(() => {
  vi.clearAllMocks()
  store.state = 'drafting'
  store.draft = {
    turnDeadline: addSeconds(new Date(), 6),
    token: 't',
    turn: 3,
    mapOptions: ['cp_a', 'cp_b', 'cp_c'],
    bans: [],
  }
})

describe('recoverDraft()', () => {
  it('schedules the turn timer again from the saved deadline', async () => {
    await recoverDraft(queue)
    expect(tasks.schedule).toHaveBeenCalledWith('queue/captain:turnTimeout', expect.any(Number), {
      queue: queue._id,
      token: 't',
      turn: 3,
    })
    const ms = vi.mocked(tasks.schedule).mock.calls[0]![1]
    expect(ms).toBeGreaterThan(secondsToMilliseconds(4))
    expect(ms).toBeLessThanOrEqual(secondsToMilliseconds(6))
  })

  it('fires at once when the deadline has passed', async () => {
    store.draft!.turnDeadline = subSeconds(new Date(), 30)
    await recoverDraft(queue)
    expect(vi.mocked(tasks.schedule).mock.calls[0]![1]).toBe(0)
  })

  it('leaves a queue that is not drafting alone', async () => {
    store.state = 'waiting'
    await recoverDraft(queue)
    expect(tasks.schedule).not.toHaveBeenCalled()
    expect(tasks.cancel).not.toHaveBeenCalled()
  })

  it('rearms the saved ban deadline with a ban phase guard', async () => {
    store.state = 'banningMaps'
    await recoverDraft(queue)
    expect(tasks.schedule).toHaveBeenCalledWith('queue/captain:turnTimeout', expect.any(Number), {
      queue: queue._id,
      token: 't',
      turn: 3,
      phase: 'ban',
    })
  })

  it('resumes the final ban transition instead of banning the survivor', async () => {
    store.state = 'banningMaps'
    store.draft!.bans = [{ map: 'cp_a' }, { map: 'cp_b' }]
    await recoverDraft(queue)
    expect(settleMapBans).toHaveBeenCalledWith(queue, store.draft, emit)
    expect(tasks.schedule).not.toHaveBeenCalled()
  })
  it('draws maps for an older persisted phase without map options', async () => {
    store.state = 'banningMaps'
    store.draft!.mapOptions = []
    await recoverDraft(queue)
    expect(beginMapBans).toHaveBeenCalledWith(queue, store.draft, [], emit)
  })

  it('finishes cleanup of an already created game without replaying global creation effects', async () => {
    store.state = 'launching'
    const game = { number: 42 }
    vi.mocked(collections.games.findOne).mockResolvedValueOnce(game as never)
    await recoverDraft(queue)
    expect(emit).toHaveBeenCalledExactlyOnceWith('queue/captainGame:created', { game })
  })

  it('resumes creation when a launch was persisted but the game does not exist', async () => {
    store.state = 'launching'
    vi.mocked(collections.games.findOne).mockResolvedValueOnce(null)
    await recoverDraft(queue)
    expect(emit).toHaveBeenCalledExactlyOnceWith('queue/captain:launching', { token: 't' })
  })

  it('refuses an auto queue', async () => {
    await expect(recoverDraft({ ...queue, launchMode: 'auto' } as QueueModel)).rejects.toThrow(
      'not a captain queue',
    )
    expect(tasks.schedule).not.toHaveBeenCalled()
  })
})
