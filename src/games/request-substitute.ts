import { collections } from '../database/collections'
import { GameEventType } from '../database/models/game-event.model'
import { SlotStatus } from '../database/models/game-slot.model'
import { GameState, type GameModel, type GameNumber } from '../database/models/game.model'
import { events } from '../events'
import { logger } from '../logger'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { findPlayerSlot } from './find-player-slot'
import { update } from './update'

export async function requestSubstitute({
  number,
  replacee,
  actor,
  reason,
}: {
  number: GameNumber
  replacee: SteamId64
  actor: SteamId64
  reason?: string
}): Promise<GameModel> {
  logger.info({ number, replacee, actor, reason }, 'substitutePlayer()')

  const game = await collections.games.findOne({ number })
  if (game === null) {
    throw new Error(`game not found: ${number}`)
  }

  if ([GameState.ended, GameState.interrupted].includes(game.state)) {
    throw new Error(`game ${game.number} in wrong state: ${game.state}`)
  }

  const slot = await findPlayerSlot(game, replacee)
  if (slot === null) {
    throw new Error(`player is not a member of game ${game.number}`)
  }

  const r = await collections.players.findOne({ steamId: replacee })
  if (r === null) {
    throw new Error(`replacee not found: ${replacee}`)
  }

  const a = await collections.players.findOne({ steamId: actor })
  if (a === null) {
    throw new Error(`actor not found: ${actor}`)
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
          player: r._id,
          gameClass: slot.gameClass,
          actor: a._id,
          reason,
        },
      },
    },
    {
      arrayFilters: [{ 'slot.player': { $eq: r._id } }],
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
