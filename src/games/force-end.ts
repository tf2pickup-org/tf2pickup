import { collections } from '../database/collections'
import { GameEndedReason, GameEventType } from '../database/models/game-event.model'
import { SlotStatus } from '../database/models/game-slot.model'
import { GameState, type GameNumber } from '../database/models/game.model'
import { events } from '../events'
import type { Bot } from '../shared/types/bot'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { update } from './update'

export async function forceEnd(
  gameNumber: GameNumber,
  actor?: SteamId64 | Bot,
  reason = GameEndedReason.interrupted,
) {
  await collections.gamesSubstituteRequests.deleteMany({ gameNumber })
  const game = await update(
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
          reason,
          ...(actor && { actor }),
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
  events.emit('game:ended', { game })
}
