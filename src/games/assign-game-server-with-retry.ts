import { secondsToMilliseconds } from 'date-fns'
import { retry } from 'es-toolkit'
import { GameEventType } from '../database/models/game-event.model'
import type { GameNumber } from '../database/models/game.model'
import { notifyGameServerAssignmentFailed } from '../discord/notify-game-server-assignment-failed'
import { logger } from '../logger'
import { assignGameServer } from './assign-game-server'
import { update } from './update'

export async function assignGameServerWithRetry(gameNumber: GameNumber) {
  try {
    await retry(() => assignGameServer(gameNumber), { retries: 3, delay: secondsToMilliseconds(1) })
  } catch (error) {
    logger.error({ error }, 'failed to assign game server after 3 attempts')

    const errorMessage = error instanceof Error ? error.message : String(error)
    const reason = errorMessage.includes('no servers available')
      ? 'no game servers available'
      : 'cannot assign game server'

    try {
      await update(gameNumber, {
        $push: {
          events: {
            event: GameEventType.gameServerAssignmentFailed,
            at: new Date(),
            reason,
          },
        },
      })
      await notifyGameServerAssignmentFailed(gameNumber, reason)
    } catch (innerError) {
      logger.error({ error, innerError }, 'failed to handle game server assignment failure')
    }

    throw error
  }
}
