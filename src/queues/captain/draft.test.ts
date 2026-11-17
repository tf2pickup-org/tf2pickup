import { beforeEach, describe, expect, it, vi } from 'vitest'

const store = vi.hoisted(() => ({
  draft: undefined as Record<string, unknown> | undefined,
  state: 'drafting',
  members: [] as unknown[],
  scheduled: [] as { name: string; ms: number; args: unknown }[],
}))

vi.mock('../../database/collections', () => ({
  collections: {
    captainDrafts: {
      deleteMany: vi.fn(() => {
        store.draft = undefined
        return Promise.resolve()
      }),
      insertOne: vi.fn((draft: Record<string, unknown>) => {
        store.draft = structuredClone(draft)
        return Promise.resolve()
      }),
      findOne: vi.fn(() => Promise.resolve(store.draft && structuredClone(store.draft))),
      updateOne: vi.fn((_filter: unknown, update: { $set: Record<string, unknown> }) => {
        Object.assign(store.draft!, structuredClone(update.$set))
        return Promise.resolve()
      }),
    },
    queueState: {
      findOne: vi.fn(() => Promise.resolve({ state: store.state })),
      updateOne: vi.fn((_filter: unknown, update: { $set: { state: string } }) => {
        store.state = update.$set.state
        return Promise.resolve()
      }),
    },
    captainPool: {
      find: vi.fn(() => ({ toArray: () => Promise.resolve(structuredClone(store.members)) })),
    },
  },
}))
vi.mock('../../logger', () => ({ logger: { info: vi.fn(), error: vi.fn() } }))
vi.mock('../../tasks', () => ({
  tasks: {
    cancel: vi.fn(() => {
      store.scheduled = []
      return Promise.resolve()
    }),
    schedule: vi.fn((name: string, ms: number, args: unknown) => {
      store.scheduled.push({ name, ms, args })
      return Promise.resolve()
    }),
  },
}))
vi.mock('./metrics', () => ({
  draftPoolSize: { record: vi.fn() },
  draftTurnCount: { add: vi.fn() },
}))
vi.mock('../get', () => ({ get: vi.fn() }))
vi.mock('../get-state', () => ({ getState: vi.fn(() => Promise.resolve(store.state)) }))
vi.mock('../auto/queue-command', () => ({
  queueCommand: vi.fn(async (_operation: string, fn: (emit: unknown) => unknown) => await fn(emit)),
}))

const emit = vi.fn()

import { ObjectId } from 'mongodb'
import type { CaptainPoolModel } from '../../database/models/captain-pool.model'
import type { QueueId, QueueModel } from '../../database/models/queue.model'
import { Gamemode } from '../../shared/types/gamemode'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { collections } from '../../database/collections'
import { tasks } from '../../tasks'
import { get } from '../get'
import { getState } from '../get-state'
import { captainRoles } from './captain-roles'
import { pick } from './pick'
import { roleKey } from './role-key'
import { startDraft } from './start-draft'
import { turnTimeout } from './turn-timeout'

const queueId = new ObjectId() as QueueId
const settings = {
  _id: queueId,
  launchMode: 'captain',
  gamemode: Gamemode.sixes,
  pickTimeout: 10_000,
} as QueueModel
const roles = captainRoles(Gamemode.sixes).map(roleKey)

// 14 players who play everything; the first two volunteer
function pool(): CaptainPoolModel[] {
  return Array.from({ length: 14 }, (_, index) => ({
    queue: queueId,
    player: {
      steamId: `7656119800000${String(index).padStart(4, '0')}` as SteamId64,
      name: `p${index}`,
      avatarUrl: '',
    },
    roles,
    volunteer: index < 2,
    ready: true,
    locked: true,
    joinedAt: new Date(index),
  }))
}

function draft() {
  return store.draft as unknown as {
    red: SteamId64
    blu: SteamId64
    token: string
    turn: number
    picks: { team: string; player: SteamId64; role: string; how: string }[]
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  store.draft = undefined
  store.state = 'drafting'
  store.members = pool()
  store.scheduled = []
  vi.mocked(get).mockResolvedValue(settings)
})

describe('startDraft()', () => {
  it('draws the two volunteers as captains and starts RED’s turn', async () => {
    await startDraft(settings, pool(), emit)

    const { red, blu, picks, turn } = draft()
    expect([red, blu].sort()).toEqual([pool()[0]!.player.steamId, pool()[1]!.player.steamId].sort())
    expect(picks).toEqual([])
    expect(turn).toBe(0)
    expect(store.scheduled).toEqual([
      expect.objectContaining({
        name: 'queue/captain:turnTimeout',
        args: expect.objectContaining({ turn: 0 }),
      }),
    ])
    expect(emit).toHaveBeenCalledWith(
      'queue/captainDraft:turn',
      expect.objectContaining({ captain: red, picks: [1] }),
    )
  })
})

describe('pick()', () => {
  beforeEach(async () => {
    await startDraft(settings, pool(), emit)
    emit.mockClear()
  })

  it('accepts the captain on the clock and keeps the clock for a double turn', async () => {
    const { red, blu } = draft()
    const player = pool()[5]!.player.steamId
    await pick(queueId, red, player, roles[0]!)
    expect(draft().picks).toEqual([expect.objectContaining({ team: 'red', player, how: 'chosen' })])
    expect(draft().turn).toBe(1)

    const second = pool()[6]!.player.steamId
    await pick(queueId, blu, second, roles[1]!)
    expect(draft().turn).toBe(1)
    await pick(queueId, blu, pool()[7]!.player.steamId, roles[2]!)
    expect(draft().turn).toBe(2)
  })

  it('stays within 10 database operations', async () => {
    const { red } = draft()
    vi.clearAllMocks()
    await pick(queueId, red, pool()[5]!.player.steamId, roles[0]!)

    const mocked = [
      ...Object.values(collections.captainDrafts),
      ...Object.values(collections.queueState),
      ...Object.values(collections.captainPool),
      get,
      getState,
      tasks.schedule,
    ] as ReturnType<typeof vi.fn>[]
    // tasks.cancel is a find and a delete
    const operations =
      mocked.reduce((sum, fn) => sum + fn.mock.calls.length, 0) +
      2 * vi.mocked(tasks.cancel).mock.calls.length
    expect(operations).toBeLessThanOrEqual(10)
  })

  it.each([
    ['the off-turn captain', () => draft().blu, () => pool()[5]!.player.steamId, () => roles[0]!],
    [
      'a non-captain',
      () => pool()[5]!.player.steamId,
      () => pool()[6]!.player.steamId,
      () => roles[0]!,
    ],
    ['a captain as the pick', () => draft().red, () => draft().blu, () => roles[0]!],
    ['an unknown role', () => draft().red, () => pool()[5]!.player.steamId, () => 'spy:spy'],
    ['an unknown player', () => draft().red, () => '76561198999999999', () => roles[0]!],
  ])('rejects %s without changing anything', async (_name, actor, player, role) => {
    await expect(pick(queueId, actor(), player() as SteamId64, role())).rejects.toThrow()
    expect(draft().picks).toEqual([])
  })

  it('rejects a pick of a player who was already picked', async () => {
    const { red, blu } = draft()
    const player = pool()[5]!.player.steamId
    await pick(queueId, red, player, roles[0]!)
    await expect(pick(queueId, blu, player, roles[1]!)).rejects.toThrow()
    expect(draft().picks).toHaveLength(1)
  })
})

describe('turnTimeout()', () => {
  it('picks the longest-waiting players for the whole turn, and plays a full draft out', async () => {
    await startDraft(settings, pool(), emit)

    for (let turns = 0; turns < 20 && store.state === 'drafting'; turns++) {
      const { token, turn } = draft()
      await turnTimeout(queueId, token, turn)
    }

    expect(store.state).toBe('banningMaps')
    const { picks, red, blu } = draft()
    expect(picks).toHaveLength(10)
    expect(picks.every(({ how }) => how === 'timedOut' || how === 'forced')).toBe(true)
    const picked = picks.map(({ player }) => player)
    expect(new Set(picked).size).toBe(10)
    expect(picked).not.toContain(red)
    expect(picked).not.toContain(blu)
    expect(picks[0]!.team).toBe('red')
  })

  it('ignores a timer of an earlier turn or draft', async () => {
    await startDraft(settings, pool(), emit)
    const { token } = draft()
    await turnTimeout(queueId, token, 3)
    await turnTimeout(queueId, 'another-draft', 0)
    expect(draft().picks).toEqual([])
  })
})
