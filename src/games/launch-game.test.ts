import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./create', () => ({
  create: vi.fn(),
}))

vi.mock('./assign-game-server', () => ({
  assignGameServer: vi.fn(),
}))

vi.mock('./rcon/configure', () => ({
  configure: vi.fn(),
}))

vi.mock('../queue', () => ({
  queue: {
    getSlots: vi.fn(),
    getMapWinner: vi.fn(),
    getFriends: vi.fn(),
  },
}))

vi.mock('../logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}))

vi.mock('../discord/notify-game-server-assignment-failed', () => ({
  notifyGameServerAssignmentFailed: vi.fn(),
}))

vi.mock('./update', () => ({
  update: vi.fn(),
}))

import { launchGame } from './launch-game'
import { create } from './create'
import { assignGameServer } from './assign-game-server'
import { configure } from './rcon/configure'
import { queue } from '../queue'
import { notifyGameServerAssignmentFailed } from '../discord/notify-game-server-assignment-failed'
import { update } from './update'
import type { GameModel } from '../database/models/game.model'

const fakeGame = { number: 1 } as GameModel

describe('launchGame()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(queue.getSlots).mockResolvedValue([])
    vi.mocked(queue.getMapWinner).mockResolvedValue('cp_process_final')
    vi.mocked(queue.getFriends).mockResolvedValue([])
    vi.mocked(create).mockResolvedValue(fakeGame)
    vi.mocked(assignGameServer).mockResolvedValue(undefined)
    vi.mocked(configure).mockResolvedValue(undefined)
  })

  it('creates a game then assigns a server then configures it in order', async () => {
    const callOrder: string[] = []
    vi.mocked(create).mockImplementation(async () => {
      callOrder.push('create')
      return fakeGame
    })
    vi.mocked(assignGameServer).mockImplementation(async () => {
      callOrder.push('assign')
    })
    vi.mocked(configure).mockImplementation(async () => {
      callOrder.push('configure')
    })

    await launchGame()

    expect(callOrder).toEqual(['create', 'assign', 'configure'])
  })

  it('passes slots, map, and friends from the queue to create()', async () => {
    const slots = [{ id: 'slot-1' }] as never
    const friends = [['76561198000000001', '76561198000000002']] as never
    vi.mocked(queue.getSlots).mockResolvedValue(slots)
    vi.mocked(queue.getMapWinner).mockResolvedValue('cp_badlands')
    vi.mocked(queue.getFriends).mockResolvedValue(friends)

    await launchGame()

    expect(create).toHaveBeenCalledWith(slots, 'cp_badlands', friends)
  })

  it('retries assignGameServer up to 3 times before giving up', async () => {
    vi.mocked(assignGameServer).mockRejectedValue(new Error('no servers available'))
    vi.mocked(update).mockResolvedValue(fakeGame)
    vi.mocked(notifyGameServerAssignmentFailed).mockResolvedValue(undefined)

    await expect(launchGame()).rejects.toThrow('no servers available')
    // 1 initial attempt + 3 retries = 4 calls
    expect(assignGameServer).toHaveBeenCalledTimes(4)
  })

  it('records gameServerAssignmentFailed event when all retries are exhausted', async () => {
    vi.mocked(assignGameServer).mockRejectedValue(new Error('no servers available'))
    vi.mocked(update).mockResolvedValue(fakeGame)
    vi.mocked(notifyGameServerAssignmentFailed).mockResolvedValue(undefined)

    await expect(launchGame()).rejects.toThrow()

    expect(update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        $push: expect.objectContaining({
          events: expect.objectContaining({ event: 'game server assignment failed' }),
        }),
      }),
    )
  })

  it('notifies Discord when game server assignment fails', async () => {
    vi.mocked(assignGameServer).mockRejectedValue(new Error('no servers available'))
    vi.mocked(update).mockResolvedValue(fakeGame)
    vi.mocked(notifyGameServerAssignmentFailed).mockResolvedValue(undefined)

    await expect(launchGame()).rejects.toThrow()

    expect(notifyGameServerAssignmentFailed).toHaveBeenCalledWith(1, 'no game servers available')
  })

  it('does not call configure() when assignment fails', async () => {
    vi.mocked(assignGameServer).mockRejectedValue(new Error('no servers available'))
    vi.mocked(update).mockResolvedValue(fakeGame)
    vi.mocked(notifyGameServerAssignmentFailed).mockResolvedValue(undefined)

    await expect(launchGame()).rejects.toThrow()

    expect(configure).not.toHaveBeenCalled()
  })
})
