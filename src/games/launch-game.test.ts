import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ObjectId } from 'mongodb'
import type { QueueId, QueueModel } from '../database/models/queue.model'
import type { LaunchSnapshot } from '../queues/types/launch-snapshot'

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
import { configure } from './rcon/configure'

const snapshot: LaunchSnapshot = {
  queue: { _id: new ObjectId() as QueueId, gamemode: '6v6', maps: [] } as unknown as QueueModel,
  slots: [],
  map: 'cp_badlands',
  friends: [],
}

describe('launchGame()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates the game from the launch snapshot', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(create).mockResolvedValue({ number: 42 } as any)

    await launchGame(snapshot)

    expect(create).toHaveBeenCalledWith(snapshot.queue, [], 'cp_badlands', [])
  })

  it('assigns a game server to the created game', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(create).mockResolvedValue({ number: 42 } as any)

    await launchGame(snapshot)

    expect(assignGameServer).toHaveBeenCalledWith(42, { retries: 3 })
    expect(configure).toHaveBeenCalledWith(42)
  })

  it('throws when game creation fails', async () => {
    vi.mocked(create).mockRejectedValue(new Error('queue slot medic-1 is empty'))

    await expect(launchGame(snapshot)).rejects.toThrow('queue slot medic-1 is empty')
    expect(assignGameServer).not.toHaveBeenCalled()
  })

  it('does not throw when the game server cannot be assigned, since the game exists', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(create).mockResolvedValue({ number: 42 } as any)
    vi.mocked(assignGameServer).mockRejectedValue(new Error('no free game server'))

    await launchGame(snapshot)

    expect(configure).not.toHaveBeenCalled()
  })
})
