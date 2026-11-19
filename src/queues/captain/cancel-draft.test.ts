import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  queueState: 'drafting' as string,
  draft: {
    red: '76561198000000001',
    blu: '76561198000000002',
    startedAt: new Date(Date.now() - 20_000),
  } as unknown,
}))
const log = vi.hoisted(() => ({ info: vi.fn() }))
const metric = vi.hoisted(() => ({ add: vi.fn() }))

vi.mock('../../database/collections', () => ({
  collections: {
    queueState: { findOne: vi.fn(() => Promise.resolve({ state: state.queueState })) },
    captainDrafts: { findOne: vi.fn(() => Promise.resolve(state.draft)) },
    captainPool: {
      findOne: vi.fn(() => Promise.resolve({ player: { name: 'Captain Red' } })),
    },
  },
}))
vi.mock('../../logger', () => ({ logger: log }))
vi.mock('../../pre-ready', () => ({ preReady: { cancel: vi.fn() } }))
vi.mock('../../games/apply-escalating-cooldown', () => ({ applyEscalatingCooldown: vi.fn() }))
vi.mock('./metrics', () => ({ captainDraftMetrics: { aborted: metric } }))
vi.mock('./machine', () => ({ captainMachine: { toWaiting: vi.fn() } }))
vi.mock('../get', () => ({ get: vi.fn() }))
vi.mock('../queue-command', () => ({
  queueCommand: vi.fn(async (_operation: string, fn: (emit: unknown) => unknown) => await fn(emit)),
}))

const emit = vi.fn()

import { secondsToMilliseconds } from 'date-fns'
import { ObjectId } from 'mongodb'
import type { QueueId, QueueModel } from '../../database/models/queue.model'
import { QueueState } from '../../database/models/queue-state.model'
import { applyEscalatingCooldown } from '../../games/apply-escalating-cooldown'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { get } from '../get'
import { cancelDraft } from './cancel-draft'
import { captainMachine } from './machine'

const queue = new ObjectId() as QueueId
const red = '76561198000000001' as SteamId64
const blu = '76561198000000002' as SteamId64
const other = '76561198000000003' as SteamId64
const settings = { _id: queue, launchMode: 'captain' } as QueueModel

beforeEach(() => {
  vi.clearAllMocks()
  state.queueState = 'drafting'
  state.draft = { red, blu, startedAt: new Date(Date.now() - secondsToMilliseconds(20)) }
  vi.mocked(get).mockResolvedValue(settings)
})

describe('cancelDraft()', () => {
  it.each([QueueState.drafting, QueueState.banningMaps])(
    'ends the draft of a captain during %s, with a cooldown',
    async phase => {
      state.queueState = phase
      await cancelDraft(queue, red)

      expect(captainMachine.toWaiting).toHaveBeenCalledExactlyOnceWith(settings, emit, {
        draft: state.draft,
        remove: [red],
      })
      expect(emit).toHaveBeenCalledWith('queue/captainDraft:cancelled', {
        queue,
        captain: red,
        name: 'Captain Red',
      })
      expect(applyEscalatingCooldown).toHaveBeenCalledWith(red, 'Cancelled a captain draft')
      expect(metric.add).toHaveBeenCalledWith(1, { reason: 'cancelled' })
      expect(log.info).toHaveBeenCalledWith({ queue, steamId: red }, 'captain draft cancelled')
    },
  )

  it('lets the other captain cancel too', async () => {
    await cancelDraft(queue, blu)
    expect(applyEscalatingCooldown).toHaveBeenCalledWith(blu, 'Cancelled a captain draft')
  })

  it.each([
    ['a player who is not a captain', other, QueueState.drafting, 'only a captain'],
    ['a queue with no draft running', red, QueueState.waiting, 'no draft'],
    ['a queue that is launching', red, QueueState.launching, 'no draft'],
  ])('refuses %s without changing anything', async (_name, actor, phase, message) => {
    state.queueState = phase
    await expect(cancelDraft(queue, actor)).rejects.toThrow(message)
    expect(captainMachine.toWaiting).not.toHaveBeenCalled()
    expect(applyEscalatingCooldown).not.toHaveBeenCalled()
  })

  it('refuses an auto queue', async () => {
    vi.mocked(get).mockResolvedValue({ ...settings, launchMode: 'auto' } as QueueModel)
    await expect(cancelDraft(queue, red)).rejects.toThrow('not a captain queue')
    expect(applyEscalatingCooldown).not.toHaveBeenCalled()
  })
})
