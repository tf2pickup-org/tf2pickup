import { Mutex } from 'async-mutex'
import { GameState, type GameModel, type GameNumber } from '../database/models/game.model'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { logger } from '../logger'
import { collections } from '../database/collections'
import { PlayerConnectionStatus, SlotStatus } from '../database/models/game-slot.model'
import { update } from './update'
import { GameEventType } from '../database/models/game-event.model'
import { events } from '../events'

const replacePlayerMutex = new Mutex()

export async function replacePlayer({
  number,
  replacee,
  replacement,
}: {
  number: GameNumber
  replacee: SteamId64
  replacement: SteamId64
}): Promise<GameModel> {
  return await replacePlayerMutex.runExclusive(async () => {
    logger.info({ number, replacee, replacement }, 'replacePlayer()')

    const game = await collections.games.findOne({ number })
    if (game === null) {
      throw new Error(`game not found: ${number}`)
    }

    if ([GameState.ended, GameState.interrupted].includes(game.state)) {
      throw new Error(`game ${game.number} in wrong state: ${game.state}`)
    }

    const slot = await findPlayerSlot(game, replacee)
    if (slot === null) {
      throw new Error(`player slot unavailable (gameNumber=${game.number}, replacee=${replacee})`)
    }

    const re = await collections.players.findOne({ steamId: replacee })
    if (!re) {
      throw new Error(`replacee player not found: ${replacee}`)
    }

    const rm = await collections.players.findOne({ steamId: replacement })
    if (!rm) {
      throw new Error(`replacement player not found: ${replacement}`)
    }

    let newGame: GameModel

    if (re._id.equals(rm._id)) {
      newGame = await update(
        { number },
        {
          $set: {
            'slots.$[slot].status': SlotStatus.active,
          },
          $push: {
            events: {
              event: GameEventType.playerReplaced,
              at: new Date(),
              replacee: re._id,
              replacement: rm._id,
            },
          },
        },
        {
          arrayFilters: [
            {
              $and: [{ 'slot.player': { $eq: re._id } }],
            },
          ],
        },
      )
    } else {
      if (rm.activeGame !== undefined) {
        throw new Error(`player denied: player has active game`)
      }

      await update(
        { number },
        {
          $push: {
            slots: {
              player: rm._id,
              team: slot.team,
              gameClass: slot.gameClass,
              status: SlotStatus.active,
              connectionStatus: PlayerConnectionStatus.offline,
            },
            events: {
              event: GameEventType.playerReplaced,
              at: new Date(),
              replacee: re._id,
              replacement: rm._id,
            },
          },
        },
      )

      newGame = await update(
        { number },
        {
          $set: {
            'slots.$[slot].status': SlotStatus.replaced,
          },
        },
        {
          arrayFilters: [
            {
              $and: [
                { 'slot.player': { $eq: re._id } },
                {
                  'slot.status': {
                    $eq: SlotStatus.waitingForSubstitute,
                  },
                },
              ],
            },
          ],
        },
      )
    }

    events.emit('game:playerReplaced', { game: newGame, replacee, replacement })
    return game
  })
}

async function findPlayerSlot(game: GameModel, player: SteamId64) {
  for (const slot of game.slots.filter(s => s.status === SlotStatus.waitingForSubstitute)) {
    const ps = await collections.players.findOne({ _id: slot.player })
    if (!ps) {
      throw new Error(`player in slot does not exist: ${slot.player.toString()}`)
    }

    if (ps.steamId === player) {
      return slot
    }
  }

  return null
}
