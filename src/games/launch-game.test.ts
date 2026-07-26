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

vi.mock('../configuration', () => ({
  configuration: { get: vi.fn().mockResolvedValue('auto') },
}))

vi.mock('../database/collections', () => ({
  collections: { captainDraft: { findOne: vi.fn() } },
}))

vi.mock('../queue-captain', () => ({
  queueCaptain: { reset: vi.fn() },
}))

import { launchGame } from './launch-game'
import { create } from './create'
import { assignGameServer } from './assign-game-server'
import { queue } from '../queue-auto'
import { configuration } from '../configuration'
import { collections } from '../database/collections'
import { queueCaptain } from '../queue-captain'

describe('launchGame()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(configuration.get).mockResolvedValue('auto')
  })

  it('assigns a game server to the created game', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(create).mockResolvedValue({ number: 42 } as any)

    await launchGame()

    expect(assignGameServer).toHaveBeenCalledWith(42, { retries: 3 })
    expect(queue.unreadyQueue).not.toHaveBeenCalled()
  })

  it('reverts the queue when game creation fails', async () => {
    vi.mocked(create).mockRejectedValue(new Error('queue slot medic-1 is empty'))

    await launchGame()

    expect(queue.unreadyQueue).toHaveBeenCalled()
    expect(assignGameServer).not.toHaveBeenCalled()
  })

  describe('in captain mode', () => {
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(configuration.get).mockResolvedValue('captain' as any)
    })

    it('creates the game from the completed draft', async () => {
      const draft = { selectedMap: 'cp_process_final' }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(collections.captainDraft.findOne).mockResolvedValue(draft as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(create).mockResolvedValue({ number: 7 } as any)

      await launchGame()

      expect(create).toHaveBeenCalledWith(draft, 'cp_process_final')
      expect(assignGameServer).toHaveBeenCalledWith(7, { retries: 3 })
      expect(queueCaptain.reset).not.toHaveBeenCalled()
    })

    it('resets the draft when it is incomplete', async () => {
      vi.mocked(collections.captainDraft.findOne).mockResolvedValue(null)

      await launchGame()

      expect(create).not.toHaveBeenCalled()
      expect(queueCaptain.reset).toHaveBeenCalled()
      expect(assignGameServer).not.toHaveBeenCalled()
    })

    it('resets the draft when game creation fails', async () => {
      const draft = { selectedMap: 'cp_process_final' }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(collections.captainDraft.findOne).mockResolvedValue(draft as any)
      vi.mocked(create).mockRejectedValue(new Error('player is offline'))

      await launchGame()

      expect(queueCaptain.reset).toHaveBeenCalled()
      expect(assignGameServer).not.toHaveBeenCalled()
    })
  })
})
