import { describe, expect, it, vi } from 'vitest'

vi.mock('../../database/collections', () => ({
  collections: {
    queueSlots: { findOne: vi.fn() },
    queueFriends: { find: vi.fn(), deleteMany: vi.fn() },
  },
}))
vi.mock('../../logger', () => ({ logger: { trace: vi.fn() } }))
vi.mock('./kick-from-queue', () => ({ kickFromQueue: vi.fn() }))
const emit = vi.hoisted(() => vi.fn())
vi.mock('./queue-command', () => ({
  queueCommand: vi.fn(
    async (_operation: string, fn: (e: typeof emit) => unknown) => await fn(emit),
  ),
}))

import { ObjectId } from 'mongodb'
import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { kickFromQueue } from './kick-from-queue'
import { queueCommand } from './queue-command'
import { removePlayer } from './remove-player'

const queue = new ObjectId() as QueueId
const player = '76561198074409147' as SteamId64
const medic = '76561198074409148' as SteamId64
const friend = '76561198074409149' as SteamId64

function givenFriendships(friendships: { source: SteamId64; target: SteamId64 }[]) {
  vi.mocked(collections.queueFriends.find).mockReturnValue({
    toArray: () => Promise.resolve(friendships.map(f => ({ queue, ...f }))),
  } as never)
}

describe('removePlayer()', () => {
  it('kicks the player and drops their friendships inside one queue command', async () => {
    vi.mocked(collections.queueSlots.findOne).mockResolvedValue({ queue } as never)
    givenFriendships([
      { source: medic, target: player },
      { source: player, target: friend },
    ])

    await removePlayer(player)

    expect(queueCommand).toHaveBeenCalledOnce()
    expect(kickFromQueue).toHaveBeenCalledWith(queue, [player], emit)
    expect(collections.queueFriends.deleteMany).toHaveBeenCalledWith({
      $or: [{ source: player }, { target: player }],
    })
    expect(emit).toHaveBeenCalledWith('queue/friendship:removed', {
      queue,
      source: medic,
      target: player,
    })
    expect(emit).toHaveBeenCalledWith('queue/friendship:removed', {
      queue,
      source: player,
      target: friend,
    })
  })

  it('does nothing for a player who is not queued and has no friendships', async () => {
    vi.clearAllMocks()
    vi.mocked(collections.queueSlots.findOne).mockResolvedValue(null)
    givenFriendships([])

    await removePlayer(player)

    expect(kickFromQueue).not.toHaveBeenCalled()
    expect(collections.queueFriends.deleteMany).not.toHaveBeenCalled()
    expect(emit).not.toHaveBeenCalled()
  })
})
