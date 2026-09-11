import { beforeEach, describe, expect, it, vi } from 'vitest'

const boundQueue = vi.hoisted(() => ({
  slots: vi.fn().mockResolvedValue([]),
  mapWinner: vi.fn().mockResolvedValue('cp_badlands'),
  friends: vi.fn().mockResolvedValue([]),
  unready: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../queue-auto', () => ({
  queue: {
    for: () => boundQueue,
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
    expect(boundQueue.unready).not.toHaveBeenCalled()
  })

  it('reverts the queue when game creation fails', async () => {
    vi.mocked(create).mockRejectedValue(new Error('queue slot medic-1 is empty'))

    await launchGame(Gamemode.sixes)

    expect(boundQueue.unready).toHaveBeenCalled()
    expect(assignGameServer).not.toHaveBeenCalled()
  })
})
