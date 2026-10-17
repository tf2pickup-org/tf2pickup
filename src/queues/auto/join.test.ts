import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../database/collections', () => ({
  collections: {
    queueSlots: {
      findOne: vi.fn(),
      countDocuments: vi.fn(),
      findOneAndUpdate: vi.fn(),
    },
    queueState: { updateOne: vi.fn() },
  },
}))
vi.mock('../../logger', () => ({ logger: { trace: vi.fn() } }))
vi.mock('../../players', () => ({ players: { bySteamId: vi.fn() } }))
vi.mock('../../pre-ready', () => ({ preReady: { start: vi.fn() } }))
vi.mock('../get', () => ({ get: vi.fn() }))
vi.mock('../get-state', () => ({ getState: vi.fn() }))
vi.mock('./meets-skill-threshold', () => ({ meetsSkillThreshold: vi.fn().mockResolvedValue(true) }))
vi.mock('./vacate-slot', () => ({ vacateSlot: vi.fn() }))
vi.mock('./queue-command', () => ({
  queueCommand: vi.fn(async (_operation: string, fn: (emit: unknown) => unknown) => await fn(emit)),
}))

const emit = vi.fn()

import { ObjectId } from 'mongodb'
import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import { QueueState } from '../../database/models/queue-state.model'
import { players } from '../../players'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { get } from '../get'
import { getState } from '../get-state'
import type { QueueSlotId } from '../types/queue-slot-id'
import { join } from './join'
import { vacateSlot } from './vacate-slot'

const queue = new ObjectId() as QueueId
const steamId = '76561198000000001' as SteamId64
const slotId = 'scout-1' as QueueSlotId
const slot = { _id: new ObjectId(), queue, id: slotId, gameClass: 'scout', player: null }

describe('join()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(get).mockResolvedValue({ enabled: true, requireVerification: false } as never)
    vi.mocked(players.bySteamId).mockResolvedValue({
      steamId,
      name: 'player',
      hasAcceptedRules: true,
      avatar: { medium: 'avatar' },
    } as never)
    vi.mocked(getState).mockResolvedValue(QueueState.waiting)
    vi.mocked(collections.queueSlots.findOne).mockResolvedValue(slot as never)
    // the player sits in another queue
    vi.mocked(collections.queueSlots.countDocuments).mockResolvedValue(1)
  })

  it('leaves the other queue and takes the slot', async () => {
    vi.mocked(collections.queueSlots.findOneAndUpdate)
      .mockResolvedValueOnce({ ...slot, player: { steamId } } as never)
      .mockResolvedValueOnce(null)

    await join(queue, slotId, steamId)

    expect(vacateSlot).toHaveBeenCalledWith(steamId, emit)
    expect(emit).toHaveBeenCalledWith('queue/slots:updated', expect.objectContaining({ queue }))
  })

  it('keeps the player in the other queue when the slot is taken', async () => {
    vi.mocked(collections.queueSlots.findOne)
      .mockResolvedValueOnce(slot as never)
      .mockResolvedValueOnce({ ...slot, player: { steamId: 'someone else' } } as never)

    await expect(join(queue, slotId, steamId)).rejects.toThrow('slot occupied')
    expect(vacateSlot).not.toHaveBeenCalled()
  })

  it('keeps the player in the other queue when this one is launching', async () => {
    vi.mocked(getState).mockResolvedValue(QueueState.launching)

    await expect(join(queue, slotId, steamId)).rejects.toThrow('invalid queue state')
    expect(vacateSlot).not.toHaveBeenCalled()
  })
})
