import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../database/collections', () => ({
  collections: {
    queueSlots: {
      countDocuments: vi.fn(),
    },
  },
}))

vi.mock('../players', () => ({ players: { bySteamId: vi.fn() } }))
vi.mock('../shared/default-gamemode', () => ({ defaultGamemode: '6v6' }))
vi.mock('../shared/enabled-gamemodes', () => ({ enabledGamemodes: ['6v6'] }))

vi.mock('../logger', () => ({
  logger: { trace: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { forGamemode } from './for-gamemode'
import { collections } from '../database/collections'
import { Gamemode } from '../shared/types/gamemode'

const gamemode = Gamemode.sixes
const q = forGamemode(gamemode)

describe('forGamemode()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(collections.queueSlots.countDocuments).mockResolvedValue(0)
  })

  it('exposes the gamemode it is bound to', () => {
    expect(q.gamemode).toBe(gamemode)
  })

  describe('playerCount()', () => {
    it('counts only occupied slots of this gamemode', async () => {
      vi.mocked(collections.queueSlots.countDocuments).mockResolvedValue(5)

      await expect(q.playerCount()).resolves.toBe(5)
      expect(collections.queueSlots.countDocuments).toHaveBeenCalledWith({
        gamemode,
        player: { $ne: null },
      })
    })
  })

  describe('readyCount()', () => {
    it('counts only ready slots of this gamemode', async () => {
      vi.mocked(collections.queueSlots.countDocuments).mockResolvedValue(3)

      await expect(q.readyCount()).resolves.toBe(3)
      expect(collections.queueSlots.countDocuments).toHaveBeenCalledWith({
        gamemode,
        ready: { $eq: true },
      })
    })
  })

  describe('size()', () => {
    it('counts every slot of this gamemode', async () => {
      vi.mocked(collections.queueSlots.countDocuments).mockResolvedValue(12)

      await expect(q.size()).resolves.toBe(12)
      expect(collections.queueSlots.countDocuments).toHaveBeenCalledWith({ gamemode })
    })
  })

  it('does not leak counts across gamemodes', async () => {
    await forGamemode(Gamemode.bball).size()

    expect(collections.queueSlots.countDocuments).toHaveBeenCalledWith({
      gamemode: Gamemode.bball,
    })
  })
})
