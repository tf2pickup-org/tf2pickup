import { logger } from '../logger'
import { queue } from '../queue'
import { assignGameServerWithRetry } from './assign-game-server-with-retry'
import { create } from './create'
import { configure } from './rcon/configure'

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
