import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import { QueueState } from '../../database/models/queue-state.model'
import { logger } from '../../logger'
import { tasks } from '../../tasks'
import { setState } from '../set-state'
import { unready } from './unready'

export async function unreadyQueue(queue: QueueId) {
  logger.info({ queue }, 'unready queue')
  // left over, they would fire into the queue's next ready-up
  await tasks.cancel('queue:readyUpTimeout', { queue })
  await tasks.cancel('queue:unready', { queue })
  await setState(queue, QueueState.waiting)
  const allPlayers = (
    await collections.queueSlots.find({ queue, player: { $ne: null } }).toArray()
  ).map(slot => slot.player!.steamId)
  await unready(queue, ...allPlayers)
}
