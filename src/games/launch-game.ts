import type { GameModel } from '../database/models/game.model'
import { logger } from '../logger'
import { queue } from '../queue-auto'
import { unreadyQueue } from '../queue-auto/unready-queue'
import { assignGameServer } from './assign-game-server'
import { create } from './create'
import { configure } from './rcon/configure'

export async function launchGame() {
  logger.info('launching game')

  let game: GameModel
  try {
    const slots = await queue.getSlots()
    const map = await queue.getMapWinner()
    const friends = await queue.getFriends()
    logger.trace({ slots, map, friends }, 'launchGame()')
    game = await create(slots, map, friends)
  } catch (error) {
    logger.error({ error }, 'failed to launch game; reverting queue')
    await unreadyQueue()
    return
  }

  await assignGameServer(game.number, { retries: 3 })
  void configure(game.number)
}
