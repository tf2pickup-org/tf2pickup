import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ObjectId } from 'mongodb'
import { secondsToMilliseconds } from 'date-fns'
import type { CaptainPoolModel } from '../../database/models/captain-pool.model'
import type { QueueId, QueueModel } from '../../database/models/queue.model'
import { QueueState, type QueueStateModel } from '../../database/models/queue-state.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { Gamemode } from '../../shared/types/gamemode'

const db = vi.hoisted(() => ({
  pool: [] as CaptainPoolModel[],
  queues: [] as QueueModel[],
  states: [] as QueueStateModel[],
  preReadied: [] as { steamId: SteamId64; preReadyUntil: Date }[],
}))
const emit = vi.hoisted(() => vi.fn())

function matches(member: CaptainPoolModel, filter: Record<string, unknown>) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === 'queue') return member.queue.equals(value as ObjectId)
    if (key === 'player.steamId')
      return typeof value === 'string'
        ? member.player.steamId === value
        : (value as { $in: SteamId64[] }).$in.includes(member.player.steamId)
    return member[key as keyof CaptainPoolModel] === value
  })
}

vi.mock('../../database/collections', () => ({
  collections: {
    queues: { findOne: vi.fn(async ({ _id }) => db.queues.find(queue => queue._id.equals(_id))) },
    queueState: {
      findOne: vi.fn(async ({ queue }) => db.states.find(state => state.queue.equals(queue))),
      updateOne: vi.fn(async ({ queue }, update) => {
        const state = db.states.find(state => state.queue.equals(queue))!
        Object.assign(state, update.$set)
        if (update.$unset?.captainReady) delete state.captainReady
        if (update.$unset?.last) delete state.last
      }),
    },
    players: {
      find: vi.fn(filter => ({
        toArray: async () =>
          db.preReadied.filter(
            player =>
              filter.steamId.$in.includes(player.steamId) &&
              player.preReadyUntil >= filter.preReadyUntil.$gte,
          ),
      })),
    },
    captainDrafts: { deleteMany: vi.fn(), insertOne: vi.fn() },
    captainPool: {
      find: vi.fn(filter => ({
        toArray: async () =>
          db.pool.filter(member => matches(member, filter)).map(member => ({ ...member })),
      })),
      findOne: vi.fn(async filter => db.pool.find(member => matches(member, filter)) ?? null),
      findOneAndUpdate: vi.fn(async (filter, update) => {
        const member = db.pool.find(member => matches(member, filter))
        if (!member) return null
        Object.assign(member, update.$set)
        return member
      }),
      updateMany: vi.fn(async (filter, update) => {
        for (const member of db.pool.filter(member => matches(member, filter)))
          Object.assign(member, update.$set)
      }),
      deleteMany: vi.fn(async filter => {
        db.pool = db.pool.filter(member => !matches(member, filter))
      }),
      deleteOne: vi.fn(async filter => {
        db.pool = db.pool.filter(member => !matches(member, filter))
      }),
    },
  },
}))
vi.mock('../../logger', () => ({ logger: { info: vi.fn() } }))
vi.mock('./machine/advance-draft', () => ({ advanceDraft: vi.fn() }))
vi.mock('./metrics', () => ({ captainDraftMetrics: { poolSize: { record: vi.fn() } } }))
vi.mock('../../tasks', () => ({ tasks: { cancel: vi.fn(), schedule: vi.fn() } }))
vi.mock('../../pre-ready', () => ({ preReady: { start: vi.fn(), cancel: vi.fn() } }))
vi.mock('../queue-command', () => ({
  queueCommand: vi.fn(async (_operation, run, { reevaluate = true } = {}) => {
    const result = await run(emit)
    if (reevaluate) await settle()
    return result
  }),
}))

import { collections } from '../../database/collections'
import { tasks } from '../../tasks'
import { preReady } from '../../pre-ready'
import { step } from './machine/step'
import { captainRoles } from './captain-roles'
import { roleKey } from './role-key'
import { leave } from './leave'
import { readyUp } from './ready-up'
import { readyTimeout } from './ready-timeout'

const queue = {
  _id: new ObjectId() as QueueId,
  launchMode: 'captain',
  gamemode: Gamemode.sixes,
  readyUpTimeout: secondsToMilliseconds(40),
  readyStateTimeout: secondsToMilliseconds(60),
} as QueueModel
const auto = { ...queue, _id: new ObjectId() as QueueId, launchMode: 'auto' } as QueueModel
const keys = captainRoles(queue.gamemode).map(roleKey)
const runtime = () => db.states[0]!
const id = (index: number) => db.pool[index]!.player.steamId

function member(index: number): CaptainPoolModel {
  return {
    queue: queue._id,
    player: {
      steamId: `7656119800000${String(index).padStart(4, '0')}` as SteamId64,
      name: 'a',
      avatarUrl: '',
    },
    roles: [keys[index % keys.length]!],
    volunteer: index < 2,
    ready: false,
    locked: false,
    joinedAt: new Date(index),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  db.pool = Array.from({ length: 12 }, (_, index) => member(index))
  db.queues = [queue, auto]
  db.states = [
    { queue: queue._id, state: QueueState.waiting },
    { queue: auto._id, state: QueueState.waiting },
  ]
  db.preReadied = []
})

async function settle() {
  while (await step(queue, emit));
}

async function startReady(last = id(11)) {
  runtime().last = last
  await settle()
  return runtime().captainReady?.token ?? ''
}

describe('captain ready-up lifecycle', () => {
  it('honors the filling actor and only unexpired pre-ready, persisting both deadlines', async () => {
    db.preReadied = [
      { steamId: id(0), preReadyUntil: new Date(Date.now() + secondsToMilliseconds(20)) },
      { steamId: id(1), preReadyUntil: new Date(Date.now() - secondsToMilliseconds(1)) },
    ]
    const autoBefore = structuredClone(db.states[1])
    await startReady()
    expect(runtime().state).toBe(QueueState.ready)
    expect(db.pool.filter(member => member.ready).map(member => member.player.steamId)).toEqual([
      id(0),
      id(11),
    ])
    const phase = runtime().captainReady!
    expect(phase.readyUpDeadline.getTime() - phase.startedAt.getTime()).toBe(queue.readyUpTimeout)
    expect(phase.deadline.getTime() - phase.startedAt.getTime()).toBe(queue.readyStateTimeout)
    expect(tasks.schedule).toHaveBeenCalledWith(
      'queue/captain:readyUpTimeout',
      expect.any(Number),
      { queue: queue._id, token: phase.token },
    )
    expect(tasks.schedule).toHaveBeenCalledWith(
      'queue/captain:readyStateTimeout',
      expect.any(Number),
      { queue: queue._id, token: phase.token },
    )
    expect(preReady.start).toHaveBeenCalledExactlyOnceWith(id(11))
    expect(structuredClone(db.states[1])).toEqual(autoBefore)
  })

  it('starts drafting after everyone readies, locks all members, and cancels both timers', async () => {
    await startReady()
    for (const member of db.pool.filter(member => !member.ready))
      await readyUp(queue._id, member.player.steamId)
    expect(runtime().state).toBe(QueueState.drafting)
    expect(runtime().captainReady).toBeUndefined()
    expect(db.pool.every(member => member.locked)).toBe(true)
    expect(emit.mock.calls.filter(([event]) => event === 'queue/captainDraft:starting')).toEqual([
      ['queue/captainDraft:starting', { queue: queue._id }],
    ])
    expect(tasks.cancel).toHaveBeenCalledWith('queue/captain:readyUpTimeout', { queue: queue._id })
    expect(tasks.cancel).toHaveBeenCalledWith('queue/captain:readyStateTimeout', {
      queue: queue._id,
    })
    expect(preReady.start).toHaveBeenCalledTimes(12)
  })

  it('goes directly through ready to drafting when the whole pool is pre-readied', async () => {
    db.preReadied = db.pool.map(({ player }) => ({
      steamId: player.steamId,
      preReadyUntil: new Date(Date.now() + secondsToMilliseconds(20)),
    }))
    await startReady()
    expect(runtime().state).toBe(QueueState.drafting)
    expect(emit).toHaveBeenCalledWith('queue/state:updated', {
      queue: queue._id,
      state: QueueState.ready,
    })
  })

  it('returns to waiting and clears readies when a member declines and the pool stops being full', async () => {
    await startReady()
    const departing = id(2)
    await leave(queue._id, departing)
    expect(runtime().state).toBe(QueueState.waiting)
    expect(db.pool).toHaveLength(11)
    expect(db.pool.every(member => !member.ready)).toBe(true)
    expect(preReady.cancel).toHaveBeenCalledWith(departing)
    expect(emit).toHaveBeenCalledWith('queue/captainPool:left', {
      queue: queue._id,
      player: departing,
    })
  })

  it('kicks unready players at the timeout and returns an incomplete pool to waiting', async () => {
    const token = await startReady()
    await readyTimeout(queue._id, token, 'readyUp')
    expect(runtime().state).toBe(QueueState.waiting)
    expect(db.pool).toHaveLength(1)
    expect(db.pool[0]!.ready).toBe(false)
    expect(preReady.cancel).toHaveBeenCalledTimes(11)
  })

  it('starts a draft immediately if the readied remainder can still fill both teams', async () => {
    db.pool.push({ ...member(12), roles: [keys[5]!], volunteer: false })
    const token = await startReady(id(0))
    for (const member of db.pool) member.ready = member.player.steamId !== id(11)
    const unready = id(11)
    await readyTimeout(queue._id, token, 'readyUp')
    expect(runtime().state).toBe(QueueState.drafting)
    expect(db.pool).toHaveLength(12)
    expect(db.pool.every(member => member.locked)).toBe(true)
    expect(preReady.cancel).toHaveBeenCalledWith(unready)
  })

  it('expires the ready state, clearing readies without immediately reopening ready-up', async () => {
    const token = await startReady()
    await readyTimeout(queue._id, token, 'state')
    expect(runtime().state).toBe(QueueState.waiting)
    expect(db.pool).toHaveLength(12)
    expect(db.pool.every(member => !member.ready)).toBe(true)
    expect(runtime().captainReady).toBeUndefined()
    // a stale filler must not be auto-readied the next time the pool fills
    expect(runtime().last).toBeUndefined()
  })

  it('ignores stale or duplicate timeouts, including a prior ready-up generation', async () => {
    const old = await startReady()
    await readyTimeout(queue._id, old, 'state')
    const current = await startReady()
    expect(current).not.toBe(old)
    const before = structuredClone(db.pool)
    await readyTimeout(queue._id, old, 'readyUp')
    expect(db.pool).toEqual(before)
    expect(runtime().state).toBe(QueueState.ready)
    expect(runtime().captainReady!.token).toBe(current)
  })

  it('rejects auto queues, nonmembers, wrong phases and locked members', async () => {
    await expect(readyUp(auto._id, id(0))).rejects.toThrow('not a captain queue')
    await expect(leave(auto._id, id(0))).rejects.toThrow('not a captain queue')
    await expect(readyUp(queue._id, id(0))).rejects.toThrow('wrong queue state')
    await startReady()
    await expect(readyUp(queue._id, '76561198000000999' as SteamId64)).rejects.toThrow(
      'not in the captain pool',
    )
    db.pool[0]!.locked = true
    await expect(readyUp(queue._id, id(0))).rejects.toThrow('not in the captain pool')
    await expect(leave(queue._id, id(0))).rejects.toThrow('locked')
  })

  it('does not let captain timeout handlers touch auto state, pool rows or task schedules', async () => {
    db.states[1]!.state = QueueState.ready
    const before = structuredClone(db.states)
    await readyTimeout(auto._id, 'whatever', 'state')
    expect(db.states).toEqual(before)
    expect(collections.captainPool.deleteMany).not.toHaveBeenCalled()
    expect(tasks.cancel).not.toHaveBeenCalled()
    expect(emit).not.toHaveBeenCalled()
  })
})
