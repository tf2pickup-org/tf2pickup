import type { ObjectId } from 'mongodb'
import { GameEndedReason, GameEventType } from '../database/models/game-event.model'
import { SlotStatus } from '../database/models/game-slot.model'
import { GameState, type GameNumber } from '../database/models/game.model'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { update } from './update'
import { collections } from '../database/collections'

export async function forceEnd(gameNumber: GameNumber, actor?: SteamId64) {
  let _actor: ObjectId | undefined
  if (actor) {
    const a = await collections.players.findOne({ steamId: actor })
    if (a !== null) {
      _actor = a._id
    }
  }

  await update(
    {
      number: gameNumber,
    },
    {
      $set: {
        state: GameState.interrupted,
        'slots.$[slot].status': SlotStatus.active,
      },
      $push: {
        events: {
          at: new Date(),
          event: GameEventType.gameEnded,
          reason: GameEndedReason.interrupted,
          ...(_actor && { actor: _actor }),
        },
      },
    },
    {
      arrayFilters: [
        {
          'slot.status': { $eq: SlotStatus.waitingForSubstitute },
        },
      ],
    },
  )
}
