import { Mutex } from 'async-mutex'
import type { GameNumber } from '../../database/models/game.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { logger } from '../../logger'
import { collections } from '../../database/collections'
import { PlayerConnectionStatus, SlotStatus } from '../../database/models/game-slot.model'
import { GameEventType } from '../../database/models/game-event.model'
import { events } from '../../events'
import { players } from '../../players'
import { queues } from '../../queues'
import { errors } from '../../errors'
import { logError } from '../../utils/log-error'
import { applyCooldown } from '../apply-cooldown'
import { calculateJoinGameserverTimeout } from '../calculate-join-gameserver-timeout'
import { mutex } from '../mutex'
import { substituteBlocker } from '../substitute-blocker'
import { setActiveGame } from '../set-active-game'
import { update } from '../update'
import { applyTransition } from './apply-transition'
import { runningGameStates } from './running-game-states'

// Replacements stay whole through their side effects: a late game:playerReplaced from an older
// replacement would otherwise overwrite a newer one's server whitelist and deferred kick.
const replaceMutex = new Mutex()

interface Replacement {
  number: GameNumber
  replacee: SteamId64
  replacement: SteamId64
}

export async function replace(params: Replacement) {
  return await replaceMutex.runExclusive(async () => await replaceExclusive(params))
}

async function replaceExclusive({ number, replacee, replacement }: Replacement) {
  logger.trace({ number, replacee, replacement }, 'games.replacePlayer()')

  const result = await mutex.runExclusive(async () => {
    const game = await collections.games.findOne({ number })
    if (game === null) {
      throw new Error(`game not found: ${number}`)
    }

    const slot = game.slots.find(({ player }) => player === replacee)
    if (!slot) {
      throw new Error(`player slot unavailable (gameNumber=${game.number}, replacee=${replacee})`)
    }

    if (replacee !== replacement) {
      if (slot.status !== SlotStatus.waitingForSubstitute) {
        throw errors.badRequest(`no substitute requested for ${replacee}`)
      }

      const rm = await collections.players.findOne({ steamId: replacement })
      if (!rm) {
        throw new Error(`replacement player not found: ${replacement}`)
      }

      const blocker = substituteBlocker(slot, rm)
      if (blocker) {
        throw errors.badRequest(blocker)
      }
    }

    // games transitions share this lock, so a running game stays running until applyTransition
    const claimed = replacee !== replacement && runningGameStates.includes(game.state)
    if (claimed) {
      await setActiveGame(replacement, number)
    }

    const newGame = await applyTransition(
      'replace',
      number,
      runningGameStates,
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
    if (!newGame) {
      if (claimed) {
        await setActiveGame(replacement, undefined)
      }
      return undefined
    }

    await collections.gamesSubstituteRequests.deleteOne({
      gameNumber: newGame.number,
      slotId: slot.id,
    })
    // best-effort: a failure must not undo the substitution; reconcileActiveGames() repairs it
    if (replacee !== replacement) {
      try {
        await setActiveGame(replacee, undefined)
      } catch (error) {
        logError(error)
      }
    }

    return { newGame, slot }
  })
  if (!result) {
    return undefined
  }

  const { newGame, slot } = result
  try {
    await queues.kick(replacement)
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

  if (slot.applyCooldown && replacee !== replacement) {
    await applyCooldown(replacee, newGame.number)
  }

  return updatedGame
}
