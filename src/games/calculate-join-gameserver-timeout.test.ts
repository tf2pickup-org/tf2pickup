import { beforeEach, describe, expect, it, vi } from 'vitest'
import { calculateJoinGameserverTimeout } from './calculate-join-gameserver-timeout'
import { GameState, type GameModel, type GameNumber } from '../database/models/game.model'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { ObjectId } from 'mongodb'
import { Tf2Team } from '../shared/types/tf2-team'
import { Tf2ClassName } from '../shared/types/tf2-class-name'
import { PlayerConnectionStatus, SlotStatus } from '../database/models/game-slot.model'
import { GameEventType } from '../database/models/game-event.model'

const configuration = vi.hoisted(() => new Map<string, unknown>())
vi.mock('../configuration', () => ({
  configuration: {
    get: async (key: string) => configuration.get(key),
  },
}))

const players = vi.hoisted(() => new Map<SteamId64, { _id: ObjectId }>())
vi.mock('../database/collections', () => ({
  collections: {
    players: {
      findOne: async ({ steamId }: { steamId: SteamId64 }) => players.get(steamId) ?? null,
    },
  },
}))

describe('calculateJoinGameServerTimeout', () => {
  let game: GameModel
  let steamId: SteamId64

  beforeEach(() => {
    configuration.set('games.join_gameserver_timeout', 5 * 60 * 1000)
    configuration.set('games.rejoin_gameserver_timeout', 3 * 60 * 1000)
    steamId = 'FAKE_STEAM_ID' as SteamId64
    const _id = new ObjectId()
    players.set(steamId, { _id })
    game = {
      number: 1 as GameNumber,
      state: GameState.created,
      map: 'cp_badlands',
      slots: [
        {
          player: _id,
          team: Tf2Team.blu,
          gameClass: Tf2ClassName.scout,
          status: SlotStatus.active,
          connectionStatus: PlayerConnectionStatus.connected,
        },
      ],
      events: [],
    } as GameModel
  })

  describe('when games.join_gameserver_timeout is set to 0', () => {
    beforeEach(() => {
      configuration.set('games.join_gameserver_timeout', 0)
    })

    it('should return undefined', async () => {
      expect(await calculateJoinGameserverTimeout(game, steamId)).toBe(undefined)
    })
  })

  describe('when games.rejoin_gameserver_timeout is set to 0', () => {
    beforeEach(() => {
      configuration.set('games.rejoin_gameserver_timeout', 0)
    })

    it('should return undefined', async () => {
      expect(await calculateJoinGameserverTimeout(game, steamId)).toBe(undefined)
    })
  })

  describe('when the given player is not found', () => {
    it('should throw an error', async () => {
      await expect(
        calculateJoinGameserverTimeout(game, 'ANOTHER_STEAM_ID' as SteamId64),
      ).rejects.toThrow('player ANOTHER_STEAM_ID not found')
    })
  })

  describe('when the game has been just created', () => {
    it('should return undefined', async () => {
      expect(await calculateJoinGameserverTimeout(game, steamId)).toBe(undefined)
    })
  })

  describe('when the game is launching', () => {
    beforeEach(() => {
      game.state = GameState.launching
      game.events.push({
        event: GameEventType.gameServerInitialized,
        at: new Date(2024, 0, 1, 12, 0),
      })
    })

    it('should return the join timeout', async () => {
      expect(await calculateJoinGameserverTimeout(game, steamId)).toEqual(
        new Date(2024, 0, 1, 12, 5),
      )
    })

    describe('when the player has replaced another player - immediately', () => {
      beforeEach(() => {
        game.events.push({
          event: GameEventType.playerReplaced,
          at: new Date(2024, 0, 1, 12, 0),
          replacement: players.get(steamId)!._id,
          replacee: new ObjectId(),
        })
      })

      it('should return the join timeout', async () => {
        expect(await calculateJoinGameserverTimeout(game, steamId)).toEqual(
          new Date(2024, 0, 1, 12, 5),
        )
      })
    })

    describe('when the player has replaced another player - after some time', () => {
      beforeEach(() => {
        game.events.push({
          event: GameEventType.playerReplaced,
          at: new Date(2024, 0, 1, 12, 3),
          replacement: players.get(steamId)!._id,
          replacee: new ObjectId(),
        })
      })

      it('should return the join timeout', async () => {
        expect(await calculateJoinGameserverTimeout(game, steamId)).toEqual(
          new Date(2024, 0, 1, 12, 6),
        )
      })
    })

    describe('when the player has disconnected - immediately', () => {
      beforeEach(() => {
        game.events.push({
          event: GameEventType.playerLeftGameServer,
          at: new Date(2024, 0, 1, 12, 0),
          player: players.get(steamId)!._id,
        })
      })

      it('should return the join timeout', async () => {
        expect(await calculateJoinGameserverTimeout(game, steamId)).toEqual(
          new Date(2024, 0, 1, 12, 5),
        )
      })
    })

    describe('when the player has disconnected - after some time', () => {
      beforeEach(() => {
        game.events.push({
          event: GameEventType.playerLeftGameServer,
          at: new Date(2024, 0, 1, 12, 3),
          player: players.get(steamId)!._id,
        })
      })

      it('should return the rejoin timeout', async () => {
        expect(await calculateJoinGameserverTimeout(game, steamId)).toEqual(
          new Date(2024, 0, 1, 12, 6),
        )
      })
    })
  })

  describe('when the game has started', () => {
    beforeEach(() => {
      game.state = GameState.started
    })

    describe('when the player is not found in the game', () => {
      let anotherSteamId: SteamId64

      beforeEach(() => {
        anotherSteamId = 'ANOTHER_STEAM_ID' as SteamId64
        const _id = new ObjectId()
        players.set(anotherSteamId, { _id })
      })

      it('should throw an error', async () => {
        await expect(calculateJoinGameserverTimeout(game, anotherSteamId)).rejects.toThrow(
          `player ANOTHER_STEAM_ID not found in game 1`,
        )
      })
    })

    describe('when the player is online', () => {
      beforeEach(() => {
        game.slots[0]!.connectionStatus = PlayerConnectionStatus.connected
      })

      it('should return undefined', async () => {
        expect(await calculateJoinGameserverTimeout(game, steamId)).toBe(undefined)
      })
    })

    describe('when the player is offline', () => {
      beforeEach(() => {
        game.slots[0]!.connectionStatus = PlayerConnectionStatus.offline
        game.events.push({
          event: GameEventType.playerLeftGameServer,
          at: new Date(2024, 0, 1, 12, 0),
          player: players.get(steamId)!._id,
        })
      })

      it('should return the rejoin timeout', async () => {
        expect(await calculateJoinGameserverTimeout(game, steamId)).toEqual(
          new Date(2024, 0, 1, 12, 3),
        )
      })
    })
  })

  describe('when the game has ended', () => {
    beforeEach(() => {
      game.state = GameState.ended
    })

    it('should return undefined', async () => {
      expect(await calculateJoinGameserverTimeout(game, steamId)).toBe(undefined)
    })
  })
})
