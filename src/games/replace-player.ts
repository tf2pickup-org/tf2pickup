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
    logger.trace({ number, replacee, replacement }, 'games.replacePlayer()')

    const game = await collections.games.findOne({ number })
    if (game === null) {
      throw new Error(`game not found: ${number}`)
    }

    if ([GameState.ended, GameState.interrupted].includes(game.state)) {
      throw new Error(`game ${game.number} in wrong state: ${game.state}`)
    }

    const slot = game.slots.find(({ player }) => player === replacee)
    if (!slot) {
      throw new Error(`player slot unavailable (gameNumber=${game.number}, replacee=${replacee})`)
    }

    let newGame: GameModel
    if (replacee !== replacement) {
      const rm = await collections.players.findOne({ steamId: replacement })
      if (!rm) {
        throw new Error(`replacement player not found: ${replacement}`)
      }

      if (rm.activeGame !== undefined) {
        throw new Error(`player denied: player has active game`)
      }
    }

    newGame = await update(
      { number },
      {
        $set: {
          'slots.$[slot].status': SlotStatus.active,
          'slots.$[slot].player': replacement,
          ...(replacee === replacement
            ? {}
            : { 'slots.$[slot].connectionStatus': PlayerConnectionStatus.offline }),
        },
        $push: {
          events: {
            event: GameEventType.playerReplaced,
            at: new Date(),
            replacee,
            replacement,
          },
        },
      },
      {
        arrayFilters: [
          {
            $and: [
              { 'slot.player': { $eq: replacee } },
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

    events.emit('game:playerReplaced', { game: newGame, replacee, replacement })
    return game
  })
}
