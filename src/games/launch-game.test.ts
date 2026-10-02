import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ObjectId } from 'mongodb'
import type { QueueId } from '../database/models/queue.model'

const queue = { _id: new ObjectId() as QueueId, gamemode: '6v6', maps: [] }

vi.mock('../queues/get', () => ({
  get: vi.fn().mockImplementation(() => Promise.resolve(queue)),
}))
vi.mock('../queues/auto/get-slots', () => ({ getSlots: vi.fn().mockResolvedValue([]) }))
vi.mock('../queues/auto/get-map-winner', () => ({
  getMapWinner: vi.fn().mockResolvedValue('cp_badlands'),
}))
vi.mock('../queues/auto/get-friends', () => ({ getFriends: vi.fn().mockResolvedValue([]) }))
vi.mock('../queues/auto/unready-queue', () => ({
  unreadyQueue: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('./create', () => ({
  create: vi.fn(),
}))

vi.mock('./assign-game-server', () => ({
  assignGameServer: vi.fn(),
}))

vi.mock('./rcon/configure', () => ({
  configure: vi.fn(),
}))

vi.mock('../logger', () => ({
  logger: { info: vi.fn(), trace: vi.fn(), error: vi.fn() },
}))

import { launchGame } from './launch-game'
import { create } from './create'
import { assignGameServer } from './assign-game-server'
import { unreadyQueue } from '../queues/auto/unready-queue'

describe('launchGame()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates the game from the queue', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(create).mockResolvedValue({ number: 42 } as any)

    await launchGame(queue._id)

    expect(create).toHaveBeenCalledWith(queue, [], 'cp_badlands', [])
  })

  it('assigns a game server to the created game', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(create).mockResolvedValue({ number: 42 } as any)

    await launchGame(queue._id)

    expect(assignGameServer).toHaveBeenCalledWith(42, { retries: 3 })
    expect(unreadyQueue).not.toHaveBeenCalled()
  })

  it('reverts the queue when game creation fails', async () => {
    vi.mocked(create).mockRejectedValue(new Error('queue slot medic-1 is empty'))

    await launchGame(queue._id)

    expect(unreadyQueue).toHaveBeenCalledWith(queue._id)
    expect(assignGameServer).not.toHaveBeenCalled()
  })
})
