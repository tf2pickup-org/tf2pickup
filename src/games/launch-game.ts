import type { GameModel } from '../database/models/game.model'
import type { QueueId } from '../database/models/queue.model'
import { logger } from '../logger'
import { get } from '../queues/get'
import { getFriends } from '../queues/auto/get-friends'
import { getMapWinner } from '../queues/auto/get-map-winner'
import { getSlots } from '../queues/auto/get-slots'
import { unreadyQueue } from '../queues/auto/unready-queue'
import { assignGameServer } from './assign-game-server'
import { create } from './create'
import { configure } from './rcon/configure'

export async function launchGame(queueId: QueueId) {
  logger.info({ queue: queueId }, 'launching game')

  let game: GameModel
  try {
    const queue = await get(queueId)
    const slots = await getSlots(queueId)
    const map = await getMapWinner(queueId)
    const friends = await getFriends(queueId)
    logger.trace({ queue: queueId, slots, map, friends }, 'launchGame()')
    game = await create(queue, slots, map, friends)
  } catch (error) {
    logger.error({ error }, 'failed to launch game; reverting queue')
    await unreadyQueue(queueId)
    return
  }

  await assignGameServer(game.number, { retries: 3 })
  void configure(game.number)
}
