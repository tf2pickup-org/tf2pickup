import { logger } from '../logger'
import type { LaunchSnapshot } from '../queues/types/launch-snapshot'
import { assignGameServer } from './assign-game-server'
import { create } from './create'
import { configure } from './rcon/configure'

// throws when the game could not be created
export async function launchGame({ queue, slots, map, friends }: LaunchSnapshot) {
  logger.info({ queue: queue._id }, 'launching game')
  logger.trace({ queue: queue._id, slots, map, friends }, 'launchGame()')
  const game = await create(queue, slots, map, friends)

  try {
    await assignGameServer(game.number, { retries: 3 })
  } catch (error) {
    logger.error({ error, gameNumber: game.number }, 'failed to assign a game server')
    return
  }

  void configure(game.number)
}
