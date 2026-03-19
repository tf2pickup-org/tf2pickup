import { secondsToMilliseconds } from 'date-fns'
import { retry } from 'es-toolkit'
import { GameEventType } from '../database/models/game-event.model'
import type { GameNumber } from '../database/models/game.model'
import { notifyGameServerAssignmentFailed } from '../discord/notify-game-server-assignment-failed'
import { logger } from '../logger'
import { queue } from '../queue'
import { assignGameServer } from './assign-game-server'
import { create } from './create'
import { configure } from './rcon/configure'
import { update } from './update'

export async function launchGame() {
  logger.info('launching game')
  const slots = await queue.getSlots()
  const map = await queue.getMapWinner()
  const friends = await queue.getFriends()
  logger.trace({ slots, map, friends }, 'launchGame()')
  const { number } = await create(slots, map, friends)
  await assignGameServerWithRetry(number)
  await configure(number)
}

async function assignGameServerWithRetry(gameNumber: GameNumber) {
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
