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

vi.mock('../../configuration', () => ({
  configuration: {
    get: vi.fn(),
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
import { configuration } from '../../configuration'
import { collections } from '../../database/collections'
import { players } from '..'
import plugin from './auto-verify-eligible-players'
import type { PlayerModel } from '../../database/models/player.model'

describe('auto-verify-eligible-players', () => {
  let playerUpdatedHandler: (params: { after: PlayerModel }) => Promise<void>
  let configurationUpdatedHandler: (params: { key: string }) => Promise<void>

  beforeEach(async () => {
    vi.resetAllMocks()
    vi.mocked(players.update).mockResolvedValue({} as never)

    await (plugin as unknown as () => Promise<void>)()

    const playerUpdatedCall = vi
      .mocked(events.on)
      .mock.calls.find(([event]: [string, ...unknown[]]) => event === 'player:updated')
    expect(playerUpdatedCall, 'plugin must register a player:updated handler').toBeDefined()
    playerUpdatedHandler = playerUpdatedCall![1] as typeof playerUpdatedHandler

    const configurationUpdatedCall = vi
      .mocked(events.on)
      .mock.calls.find(([event]: [string, ...unknown[]]) => event === 'configuration:updated')
    expect(
      configurationUpdatedCall,
      'plugin must register a configuration:updated handler',
    ).toBeDefined()
    configurationUpdatedHandler = configurationUpdatedCall![1] as typeof configurationUpdatedHandler
  })

  describe('player:updated', () => {
    it('verifies a player with a skill assigned when verification is required', async () => {
      vi.mocked(configuration.get).mockResolvedValue(true)

      await playerUpdatedHandler({
        after: {
          steamId: 'STEAM_0:1',
          skill: { scout: 5 },
          stats: { totalGames: 0, gamesByClass: {} },
        } as PlayerModel,
      })

      expect(players.update).toHaveBeenCalledWith('STEAM_0:1', { $set: { verified: true } })
    })

    it('verifies a player who has played a game when verification is required', async () => {
      vi.mocked(configuration.get).mockResolvedValue(true)

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
          skill: { scout: 5 },
          stats: { totalGames: 1, gamesByClass: {} },
        } as PlayerModel,
      })

      expect(configuration.get).not.toHaveBeenCalled()
      expect(players.update).not.toHaveBeenCalled()
    })

    it('does nothing when the player has no skill and has not played any games', async () => {
      await playerUpdatedHandler({
        after: {
          steamId: 'STEAM_0:1',
          stats: { totalGames: 0, gamesByClass: {} },
        } as PlayerModel,
      })

      expect(configuration.get).not.toHaveBeenCalled()
      expect(players.update).not.toHaveBeenCalled()
    })

    it('does nothing when player verification is not required', async () => {
      vi.mocked(configuration.get).mockResolvedValue(false)

      await playerUpdatedHandler({
        after: {
          steamId: 'STEAM_0:1',
          skill: { scout: 5 },
          stats: { totalGames: 0, gamesByClass: {} },
        } as PlayerModel,
      })

      expect(players.update).not.toHaveBeenCalled()
    })
  })

  describe('configuration:updated', () => {
    it('ignores unrelated configuration changes', async () => {
      await configurationUpdatedHandler({ key: 'players.etf2l_account_required' })

      expect(configuration.get).not.toHaveBeenCalled()
      expect(collections.players.updateMany).not.toHaveBeenCalled()
    })

    it('does nothing when player verification was disabled', async () => {
      vi.mocked(configuration.get).mockResolvedValue(false)

      await configurationUpdatedHandler({ key: 'queue.require_player_verification' })

      expect(collections.players.updateMany).not.toHaveBeenCalled()
    })

    it('bulk-verifies all eligible unverified players when player verification is enabled', async () => {
      vi.mocked(configuration.get).mockResolvedValue(true)

      await configurationUpdatedHandler({ key: 'queue.require_player_verification' })

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
