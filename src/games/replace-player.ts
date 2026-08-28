import { Mutex } from 'async-mutex'
import { GameState, type GameModel, type GameNumber } from '../database/models/game.model'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { logger } from '../logger'
import { collections } from '../database/collections'
import { PlayerConnectionStatus, SlotStatus } from '../database/models/game-slot.model'
import { update } from './update'
import { GameEventType } from '../database/models/game-event.model'
import { events } from '../events'
import { applyCooldown } from './apply-cooldown'
import { players } from '../players'
import { queue } from '../queue-auto'
import { calculateJoinGameserverTimeout } from './calculate-join-gameserver-timeout'
import { logError } from '../utils/log-error'

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

    if (replacee !== replacement) {
      const rm = await collections.players.findOne({ steamId: replacement })
      if (!rm) {
        throw new Error(`replacement player not found: ${replacement}`)
      }

      if (rm.activeGame !== undefined) {
        throw new Error(`player denied: player has active game`)
      }

      if (players.hasActiveBan(rm)) {
        throw new Error(`player denied: player is banned`)
      }
    }

    const shouldApplyCooldown = slot.applyCooldown && replacee !== replacement

    const newGame = await update(
      { number },
      {
        $set: {
          'slots.$[slot].status': SlotStatus.active,
          'slots.$[slot].player': replacement,
          ...(replacee === replacement
            ? {}
            : { 'slots.$[slot].connectionStatus': PlayerConnectionStatus.offline }),
        },
        $unset: {
          'slots.$[slot].applyCooldown': 1,
        },
        $push: {
          events: {
            event: GameEventType.playerReplaced,
            at: new Date(),
            replacee,
            replacement,
            gameClass: slot.gameClass,
          },
        },
      },
      {
        arrayFilters: [{ 'slot.id': { $eq: slot.id } }],
      },
    )

    await collections.gamesSubstituteRequests.deleteOne({
      gameNumber: newGame.number,
      slotId: slot.id,
    })
    // The player has been substituted. The writes below are best-effort side
    // effects of that fact: a failure here (e.g. the queue is mid-launch) must
    // not abort the substitution nor suppress the game:playerReplaced event.
    try {
      await players.update(replacement, { $set: { activeGame: newGame.number } })
      events.emit('player/activeGame:updated', {
        steamId: replacement,
        activeGame: newGame.number,
      })
      if (replacee !== replacement) {
        await players.update(replacee, { $unset: { activeGame: 1 } })
        events.emit('player/activeGame:updated', { steamId: replacee, activeGame: undefined })
      }
    } catch (error) {
      logError(error)
    }

    try {
      await queue.kick(replacement)
    } catch (error) {
      logError(error)
    }

    let updatedGame = newGame
    try {
      const shouldJoinBy = await calculateJoinGameserverTimeout(newGame, replacement)
      if (shouldJoinBy) {
        updatedGame = await update(
          newGame.number,
          { $set: { 'slots.$[slot].shouldJoinBy': shouldJoinBy } },
          { arrayFilters: [{ 'slot.player': replacement }] },
        )
      }
    } catch (error) {
      logError(error)
    }

    events.emit('game:playerReplaced', {
      game: updatedGame,
      replacee,
      replacement,
      slotId: slot.id,
    })

    if (shouldApplyCooldown) {
      await applyCooldown(replacee)
    }

    return updatedGame
  })
}
