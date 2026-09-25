import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('fastify-plugin', () => ({
  default: <T>(fn: T): T => fn,
}))

vi.mock('../../events', () => ({
  events: {
    on: vi.fn(),
  },
}))

vi.mock('../../utils/safe', () => ({
  safe: <T>(fn: T): T => fn,
}))

vi.mock('../../queues', () => ({
  queues: {
    anyRequiresVerification: vi.fn(),
  },
}))

vi.mock('../../database/collections', () => ({
  collections: {
    players: { updateMany: vi.fn() },
  },
}))

vi.mock('..', () => ({
  players: { update: vi.fn() },
}))

import { events } from '../../events'
import { Gamemode } from '../../shared/types/gamemode'
import { queues } from '../../queues'
import { collections } from '../../database/collections'
import { players } from '..'
import plugin from './auto-verify-eligible-players'
import type { PlayerModel } from '../../database/models/player.model'

describe('auto-verify-eligible-players', () => {
  let playerUpdatedHandler: (params: { after: PlayerModel }) => Promise<void>
  let queueUpdatedHandler: () => Promise<void>

  beforeEach(async () => {
    vi.resetAllMocks()
    vi.mocked(players.update).mockResolvedValue({} as never)

    await (plugin as unknown as () => Promise<void>)()

    const playerUpdatedCall = vi
      .mocked(events.on)
      .mock.calls.find(([event]: [string, ...unknown[]]) => event === 'player:updated')
    expect(playerUpdatedCall, 'plugin must register a player:updated handler').toBeDefined()
    playerUpdatedHandler = playerUpdatedCall![1] as typeof playerUpdatedHandler

    const queueUpdatedCall = vi
      .mocked(events.on)
      .mock.calls.find(([event]: [string, ...unknown[]]) => event === 'queue:updated')
    expect(queueUpdatedCall, 'plugin must register a queue:updated handler').toBeDefined()
    queueUpdatedHandler = queueUpdatedCall![1] as typeof queueUpdatedHandler
  })

  describe('player:updated', () => {
    it('verifies a player with a skill assigned when a queue requires verification', async () => {
      vi.mocked(queues.anyRequiresVerification).mockResolvedValue(true)

      await playerUpdatedHandler({
        after: {
          steamId: 'STEAM_0:1',
          skill: { [Gamemode.sixes]: { scout: 5 } },
          stats: { totalGames: 0, gamesByClass: {} },
        } as PlayerModel,
      })

      expect(players.update).toHaveBeenCalledWith('STEAM_0:1', { $set: { verified: true } })
    })

    it('verifies a player who has played a game when a queue requires verification', async () => {
      vi.mocked(queues.anyRequiresVerification).mockResolvedValue(true)

      await playerUpdatedHandler({
        after: {
          steamId: 'STEAM_0:1',
          stats: { totalGames: 1, gamesByClass: {} },
        } as PlayerModel,
      })

      expect(players.update).toHaveBeenCalledWith('STEAM_0:1', { $set: { verified: true } })
    })

    it('does nothing when the player is already verified', async () => {
      await playerUpdatedHandler({
        after: {
          steamId: 'STEAM_0:1',
          verified: true,
          skill: { [Gamemode.sixes]: { scout: 5 } },
          stats: { totalGames: 1, gamesByClass: {} },
        } as PlayerModel,
      })

      expect(queues.anyRequiresVerification).not.toHaveBeenCalled()
      expect(players.update).not.toHaveBeenCalled()
    })

    it('does nothing when the player has no skill and has not played any games', async () => {
      await playerUpdatedHandler({
        after: {
          steamId: 'STEAM_0:1',
          stats: { totalGames: 0, gamesByClass: {} },
        } as PlayerModel,
      })

      expect(queues.anyRequiresVerification).not.toHaveBeenCalled()
      expect(players.update).not.toHaveBeenCalled()
    })

    it('does nothing when no queue requires verification', async () => {
      vi.mocked(queues.anyRequiresVerification).mockResolvedValue(false)

      await playerUpdatedHandler({
        after: {
          steamId: 'STEAM_0:1',
          skill: { [Gamemode.sixes]: { scout: 5 } },
          stats: { totalGames: 0, gamesByClass: {} },
        } as PlayerModel,
      })

      expect(players.update).not.toHaveBeenCalled()
    })
  })

  describe('queue:updated', () => {
    it('does nothing when no enabled queue requires verification', async () => {
      vi.mocked(queues.anyRequiresVerification).mockResolvedValue(false)

      await queueUpdatedHandler()

      expect(collections.players.updateMany).not.toHaveBeenCalled()
    })

    it('bulk-verifies all eligible unverified players when a queue requires verification', async () => {
      vi.mocked(queues.anyRequiresVerification).mockResolvedValue(true)

      await queueUpdatedHandler()

      expect(collections.players.updateMany).toHaveBeenCalledWith(
        {
          verified: { $ne: true },
          $or: [{ skill: { $exists: true } }, { 'stats.totalGames': { $gt: 0 } }],
        },
        { $set: { verified: true } },
      )
    })
  })
})
