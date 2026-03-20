import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./create', () => ({
  create: vi.fn(),
}))

vi.mock('./assign-game-server-with-retry', () => ({
  assignGameServerWithRetry: vi.fn(),
}))

vi.mock('../tasks', () => ({
  tasks: { schedule: vi.fn() },
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

import { launchGame } from './launch-game'
import { create } from './create'
import { assignGameServerWithRetry } from './assign-game-server-with-retry'
import { tasks } from '../tasks'
import { queue } from '../queue'
import type { GameModel } from '../database/models/game.model'

const fakeGame = { number: 1 } as GameModel

describe('launchGame()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(queue.getSlots).mockResolvedValue([])
    vi.mocked(queue.getMapWinner).mockResolvedValue('cp_process_final')
    vi.mocked(queue.getFriends).mockResolvedValue([])
    vi.mocked(create).mockResolvedValue(fakeGame)
    vi.mocked(assignGameServerWithRetry).mockResolvedValue(undefined)
    vi.mocked(tasks.schedule).mockResolvedValue(undefined)
  })

  it('creates a game then assigns a server then configures it in order', async () => {
    const callOrder: string[] = []
    vi.mocked(create).mockImplementation(async () => {
      callOrder.push('create')
      return fakeGame
    })
    vi.mocked(assignGameServerWithRetry).mockImplementation(async () => {
      callOrder.push('assign')
    })
    vi.mocked(tasks.schedule).mockImplementation(async () => {
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

  it('does not schedule configure when assignment fails', async () => {
    vi.mocked(assignGameServerWithRetry).mockRejectedValue(new Error('no servers available'))

    await expect(launchGame()).rejects.toThrow()

    expect(tasks.schedule).not.toHaveBeenCalled()
  })
})
