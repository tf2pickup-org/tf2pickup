import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../database/collections', () => ({
  collections: {
    captainPool: {
      findOne: vi.fn(),
      insertOne: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    },
    queueSlots: { findOne: vi.fn().mockResolvedValue(null) },
    queueState: { updateOne: vi.fn() },
  },
}))
vi.mock('../../pre-ready', () => ({ preReady: { start: vi.fn() } }))
vi.mock('../../logger', () => ({ logger: { info: vi.fn() } }))
vi.mock('../../players', () => ({
  players: {
    bySteamId: vi.fn().mockResolvedValue({ steamId: '76561198000000001', name: 'a', avatar: {} }),
  },
}))
vi.mock('../../shared/player-avatar-url', () => ({ playerAvatarUrl: () => 'avatar' }))
vi.mock('../auto/join-blocker', () => ({ joinBlocker: vi.fn().mockReturnValue(null) }))
vi.mock('../auto/vacate-slot', () => ({ vacateSlot: vi.fn() }))
vi.mock('../get', () => ({
  get: vi.fn().mockResolvedValue({ launchMode: 'captain', gamemode: '6v6' }),
}))
vi.mock('../get-state', () => ({ getState: vi.fn() }))
vi.mock('./leave-pools', () => ({ leavePools: vi.fn() }))
vi.mock('../queue-command', () => ({
  queueCommand: vi.fn(async (_operation: string, fn: (emit: unknown) => unknown) => await fn(emit)),
}))

const emit = vi.fn()

import { ObjectId } from 'mongodb'
import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import { QueueState } from '../../database/models/queue-state.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { get } from '../get'
import { getState } from '../get-state'
import { joinBlocker } from '../auto/join-blocker'
import { vacateSlot } from '../auto/vacate-slot'
import { leavePools } from './leave-pools'
import { toggleRole } from './toggle-role'
import { toggleVolunteer } from './toggle-volunteer'

const queue = new ObjectId() as QueueId
const steamId = '76561198000000001' as SteamId64
const medic = 'medic:medic'
const demo = 'demoman:demoman'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getState).mockResolvedValue(QueueState.waiting)
  vi.mocked(collections.captainPool.findOne).mockResolvedValue(null)
  vi.mocked(collections.queueSlots.findOne).mockResolvedValue(null)
  vi.mocked(joinBlocker).mockReturnValue(null)
  vi.mocked(get).mockResolvedValue({ launchMode: 'captain', gamemode: '6v6' } as never)
})

describe('toggleRole()', () => {
  it('allows an unlocked next-game signup during launching', async () => {
    vi.mocked(getState).mockResolvedValue(QueueState.launching)
    await toggleRole(queue, steamId, medic)
    expect(collections.captainPool.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({ ready: false, locked: false }),
    )
  })

  it('joins the pool with the first role', async () => {
    await toggleRole(queue, steamId, medic)
    expect(collections.captainPool.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        queue,
        roles: [medic],
        volunteer: false,
        locked: false,
        ready: false,
      }),
    )
    expect(leavePools).toHaveBeenCalledWith(steamId, emit, queue)
    expect(collections.queueState.updateOne).toHaveBeenCalledWith(
      { queue },
      { $set: { last: steamId } },
    )
    expect(emit).toHaveBeenCalledWith('queue/captainPool:updated', { queue })
  })

  it('leaves an auto queue when joining the pool', async () => {
    vi.mocked(collections.queueSlots.findOne).mockResolvedValue({ queue, ready: false } as never)
    await toggleRole(queue, steamId, medic)
    expect(vacateSlot).toHaveBeenCalledWith(steamId, emit)
  })

  it('refuses a player readied up in an auto queue', async () => {
    vi.mocked(collections.queueSlots.findOne).mockResolvedValue({ queue, ready: true } as never)
    vi.mocked(getState).mockResolvedValue(QueueState.ready)
    await expect(toggleRole(queue, steamId, medic)).rejects.toThrow('locked into another queue')
    expect(vacateSlot).not.toHaveBeenCalled()
    expect(collections.captainPool.insertOne).not.toHaveBeenCalled()
  })

  it('marks a player who signs up during ready-up as ready', async () => {
    vi.mocked(getState).mockResolvedValue(QueueState.ready)
    await toggleRole(queue, steamId, medic)
    expect(collections.captainPool.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({ ready: true }),
    )
  })

  it('adds a second role', async () => {
    vi.mocked(collections.captainPool.findOne).mockResolvedValue({
      roles: [medic],
      locked: false,
    } as never)
    await toggleRole(queue, steamId, demo)
    expect(collections.captainPool.updateOne).toHaveBeenCalledWith(
      { queue, 'player.steamId': steamId },
      { $set: { roles: [medic, demo] } },
    )
  })

  it('leaves the pool when the last role is toggled off', async () => {
    vi.mocked(collections.captainPool.findOne).mockResolvedValue({
      roles: [medic],
      locked: false,
    } as never)
    await toggleRole(queue, steamId, medic)
    expect(collections.captainPool.deleteOne).toHaveBeenCalledWith({
      queue,
      'player.steamId': steamId,
    })
  })

  it('refuses a locked member', async () => {
    vi.mocked(collections.captainPool.findOne).mockResolvedValue({
      roles: [medic],
      locked: true,
    } as never)
    await expect(toggleRole(queue, steamId, demo)).rejects.toThrow('locked')
    expect(collections.captainPool.updateOne).not.toHaveBeenCalled()
  })

  it('refuses a role the gamemode does not have, and an auto queue', async () => {
    await expect(toggleRole(queue, steamId, 'spy:spy')).rejects.toThrow('no such role')
    vi.mocked(get).mockResolvedValue({ launchMode: 'auto', gamemode: '6v6' } as never)
    await expect(toggleRole(queue, steamId, medic)).rejects.toThrow('not a captain queue')
    expect(collections.captainPool.insertOne).not.toHaveBeenCalled()
  })

  it('refuses a newcomer the join checks block', async () => {
    vi.mocked(joinBlocker).mockReturnValue('You have active bans')
    await expect(toggleRole(queue, steamId, medic)).rejects.toThrow('active bans')
    expect(collections.captainPool.insertOne).not.toHaveBeenCalled()
  })
})

describe('toggleVolunteer()', () => {
  it('needs a pool member', async () => {
    await expect(toggleVolunteer(queue, steamId)).rejects.toThrow('not in the pool')
  })

  it('refuses a locked member', async () => {
    vi.mocked(collections.captainPool.findOne).mockResolvedValue({
      volunteer: false,
      locked: true,
    } as never)
    await expect(toggleVolunteer(queue, steamId)).rejects.toThrow('locked')
    expect(collections.captainPool.updateOne).not.toHaveBeenCalled()
  })

  it('allows an unlocked next-game volunteer during launching', async () => {
    vi.mocked(getState).mockResolvedValue(QueueState.launching)
    vi.mocked(collections.captainPool.findOne).mockResolvedValue({
      volunteer: false,
      locked: false,
    } as never)
    await toggleVolunteer(queue, steamId)
    expect(collections.captainPool.updateOne).toHaveBeenCalled()
  })

  it('toggles the flag', async () => {
    vi.mocked(collections.captainPool.findOne).mockResolvedValue({
      volunteer: false,
      locked: false,
    } as never)
    await toggleVolunteer(queue, steamId)
    expect(collections.captainPool.updateOne).toHaveBeenCalledWith(
      { queue, 'player.steamId': steamId },
      { $set: { volunteer: true } },
    )
  })
})
