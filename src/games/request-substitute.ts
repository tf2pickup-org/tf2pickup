import { GameEventType } from '../database/models/game-event.model'
import { SlotStatus } from '../database/models/game-slot.model'
import { GameState, type GameModel, type GameNumber } from '../database/models/game.model'
import { errors } from '../errors'
import { events } from '../events'
import { logger } from '../logger'
import { type Bot } from '../shared/types/bot'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { findOne } from './find-one'
import { update } from './update'

export async function requestSubstitute({
  number,
  replacee,
  actor,
  reason,
}: {
  number: GameNumber
  replacee: SteamId64
  actor: SteamId64 | Bot
  reason?: string
}): Promise<GameModel> {
  logger.trace({ number, replacee, actor, reason }, 'games.requestSubstitute()')
  const game = await findOne({ number })

  if ([GameState.ended, GameState.interrupted].includes(game.state)) {
    throw errors.badRequest(`game ${game.number} in wrong state: ${game.state}`)
  }

  const slot = game.slots.find(({ player }) => player === replacee)
  if (!slot) {
    throw errors.badRequest(`player is not a member of game ${game.number}`)
  }

  if (slot.status !== SlotStatus.active) {
    throw errors.badRequest(`invalid slot status: ${slot.status}`)
  }

  const newGame = await update(
    { number },
    {
      $set: {
        'slots.$[slot].status': SlotStatus.waitingForSubstitute,
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
    {
      arrayFilters: [{ 'slot.player': { $eq: replacee } }],
    },
  )

  events.emit('game:substituteRequested', {
    game: newGame,
    replacee,
    actor,
    ...(reason && { reason }),
  })
  return newGame
}
