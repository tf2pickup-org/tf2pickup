import { collections } from '../../database/collections'
import { GameEventType, type GameEndedReason } from '../../database/models/game-event.model'
import { SlotStatus } from '../../database/models/game-slot.model'
import type { GameNumber, GameState } from '../../database/models/game.model'
import { events } from '../../events'
import type { Bot } from '../../shared/types/bot'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { logError } from '../../utils/log-error'
import { mutex } from '../mutex'
import { applyTransition } from './apply-transition'
import { scheduleFreePlayers } from './schedule-free-players'

export async function finish(
  transition: string,
  number: GameNumber,
  from: GameState[],
  to: GameState.ended | GameState.interrupted,
  reason: GameEndedReason,
  actor?: SteamId64 | Bot,
) {
  const game = await mutex.runExclusive(async () => {
    const game = await applyTransition(
      transition,
      number,
      from,
      {
        $set: {
          state: to,
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
      { arrayFilters: [{ 'slot.status': { $eq: SlotStatus.waitingForSubstitute } }] },
    )
    if (game) {
      await collections.gamesSubstituteRequests.deleteMany({ gameNumber: number })
    }
    return game
  })
  if (game) {
    // a crash before this lands is repaired by reconcileActiveGames() on boot
    try {
      await scheduleFreePlayers(game)
    } catch (error) {
      logError(error)
    }
    events.emit('game:ended', { game })
  }
  return game
}
