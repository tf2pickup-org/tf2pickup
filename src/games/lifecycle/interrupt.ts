import { GameEndedReason } from '../../database/models/game-event.model'
import { GameState, type GameNumber } from '../../database/models/game.model'
import type { Bot } from '../../shared/types/bot'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { activityLog } from '../../activity-log'
import { logger } from '../../logger'
import { finish } from './finish'
import { runningGameStates } from './running-game-states'

export async function interrupt(
  number: GameNumber,
  actor?: SteamId64 | Bot,
  reason = GameEndedReason.interrupted,
) {
  const game = await finish(
    'interrupt',
    number,
    runningGameStates,
    GameState.interrupted,
    reason,
    actor,
  )
  if (game) {
    logger.info({ gameNumber: number, actor, reason }, `game #${number} force-ended`)
    await activityLog.record({
      type: 'game force-ended',
      gameNumber: number,
      ...(actor && { actor }),
    })
  }
  return game
}
