import { logger } from '../logger'
import type { LaunchSnapshot } from '../queues/types/launch-snapshot'
import { createCaptainGame } from './create-captain-game'
import { assignGameServer } from './assign-game-server'
import { create } from './create'
import { configure } from './rcon/configure'

// throws when the game could not be created
export async function launchGame(snapshot: LaunchSnapshot) {
  logger.info({ queue: snapshot.queue._id, token: snapshot.token }, 'launching game')
  const game = 'captains' in snapshot ? await createCaptainGame(snapshot) : await create(snapshot)
  // a replayed launch whose game already got a server
  if (game.gameServer) return

  try {
    await assignGameServer(game.number, { retries: 3 })
  } catch (error) {
    logger.error({ error, gameNumber: game.number }, 'failed to assign a game server')
    return
  }

  void configure(game.number)
}
