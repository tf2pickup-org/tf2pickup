import { logger } from '../logger'
import type { LaunchSnapshot } from '../queues/types/launch-snapshot'
import type { CaptainLaunchSnapshot } from '../queues/captain/types/captain-launch-snapshot'
import { createCaptainGame } from './create-captain-game'
import { assignGameServer } from './assign-game-server'
import { create } from './create'
import { configure } from './rcon/configure'

// throws when the game could not be created
export async function launchGame(snapshot: LaunchSnapshot | CaptainLaunchSnapshot) {
  const { queue, slots, map } = snapshot
  logger.info({ queue: queue._id }, 'launching game')
  const captain = 'captains' in snapshot
  if (queue.launchMode === 'captain' && !captain)
    throw new Error('captain launch needs drafted teams')
  if (!captain)
    logger.trace({ queue: queue._id, slots, map, friends: snapshot.friends }, 'launchGame()')
  const game = captain
    ? await createCaptainGame(snapshot)
    : await create(queue, snapshot.slots, map, snapshot.friends)
  if (captain && game.gameServer) return

  try {
    await assignGameServer(game.number, { retries: 3 })
  } catch (error) {
    logger.error({ error, gameNumber: game.number }, 'failed to assign a game server')
    return
  }

  void configure(game.number)
}
