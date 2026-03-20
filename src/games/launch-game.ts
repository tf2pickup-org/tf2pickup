import { logger } from '../logger'
import { queue } from '../queue'
import { tasks } from '../tasks'
import { assignGameServerWithRetry } from './assign-game-server-with-retry'
import { create } from './create'

export async function launchGame() {
  logger.info('launching game')
  const slots = await queue.getSlots()
  const map = await queue.getMapWinner()
  const friends = await queue.getFriends()
  logger.trace({ slots, map, friends }, 'launchGame()')
  const { number } = await create(slots, map, friends)
  await assignGameServerWithRetry(number)
  await tasks.schedule('games:configureServer', 0, { gameNumber: number })
}
