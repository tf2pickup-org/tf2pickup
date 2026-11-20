import { collections } from '../../database/collections'
import { GameEventType } from '../../database/models/game-event.model'
import { SlotStatus } from '../../database/models/game-slot.model'
import type { GameNumber } from '../../database/models/game.model'
import { errors } from '../../errors'
import { events } from '../../events'
import { logger } from '../../logger'
import { type Bot } from '../../shared/types/bot'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { activityLog } from '../../activity-log'
import { findOne } from '../find-one'
import { mutex } from '../mutex'
import { applyTransition } from './apply-transition'
import { runningGameStates } from './running-game-states'

export async function requestSubstitute({
  number,
  replacee,
  actor,
  reason,
  applyCooldown,
}: {
  number: GameNumber
  replacee: SteamId64
  actor: SteamId64 | Bot
  reason?: string
  applyCooldown?: boolean
}) {
  logger.trace({ number, replacee, actor, reason }, 'games.requestSubstitute()')
  const result = await mutex.runExclusive(async () => {
    const game = await findOne({ number }, ['slots'])
    const slot = game.slots.find(({ player }) => player === replacee)
    if (!slot) {
      throw errors.badRequest(`player is not a member of game ${number}`)
    }

    if (slot.status !== SlotStatus.active) {
      throw errors.badRequest(`invalid slot status: ${slot.status}`)
    }

    const newGame = await applyTransition(
      'requestSubstitute',
      number,
      runningGameStates,
      {
        $set: {
          'slots.$[slot].status': SlotStatus.waitingForSubstitute,
          'slots.$[slot].applyCooldown': applyCooldown,
        },
        $push: {
          events: {
            event: GameEventType.substituteRequested,
            at: new Date(),
            player: replacee,
            gameClass: slot.gameClass,
            actor,
            reason,
          },
        },
      },
      { arrayFilters: [{ 'slot.player': { $eq: replacee } }] },
    )
    if (!newGame) {
      return undefined
    }

    await collections.gamesSubstituteRequests.insertOne({
      gameNumber: number,
      slotId: slot.id,
      team: slot.team,
      gameClass: slot.gameClass,
    })
    return { newGame, slot }
  })
  if (!result) {
    return undefined
  }

  const { newGame, slot } = result
  await activityLog.record({
    type: 'substitute requested',
    gameNumber: number,
    player: replacee,
    actor,
    gameClass: slot.gameClass,
    ...(reason && { reason }),
  })
  events.emit('game:substituteRequested', {
    game: newGame,
    replacee,
    slotId: slot.id,
    actor,
    ...(reason && { reason }),
  })
  return newGame
}
