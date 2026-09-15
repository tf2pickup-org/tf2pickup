import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../queue-auto', () => ({
  queue: {
    getSlots: vi.fn().mockResolvedValue([]),
    getMapWinner: vi.fn().mockResolvedValue('cp_badlands'),
    getFriends: vi.fn().mockResolvedValue([]),
    unreadyQueue: vi.fn().mockResolvedValue(),
  },
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
import { queue } from '../queue-auto'
import { Gamemode } from '../shared/types/gamemode'

describe('launchGame()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('assigns a game server to the created game', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(create).mockResolvedValue({ number: 42 } as any)

    await launchGame(Gamemode.sixes)

    expect(assignGameServer).toHaveBeenCalledWith(42, { retries: 3 })
    expect(queue.unreadyQueue).not.toHaveBeenCalled()
  })

  it('reverts the queue when game creation fails', async () => {
    vi.mocked(create).mockRejectedValue(new Error('queue slot medic-1 is empty'))

    await launchGame(Gamemode.sixes)

    expect(queue.unreadyQueue).toHaveBeenCalled()
    expect(assignGameServer).not.toHaveBeenCalled()
  })
})
