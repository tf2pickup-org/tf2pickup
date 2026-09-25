import { collections } from '../database/collections'
import { QueueState } from '../database/models/queue-state.model'
import { logger } from '../logger'
import { setState } from '../queue/set-state'
import { tasks } from '../tasks'
import { unready } from './unready'

export async function unreadyQueue() {
  logger.info('unready queue')
  // left over, they would fire into the queue's next ready-up
  await tasks.cancelAll('queue:readyUpTimeout')
  await tasks.cancelAll('queue:unready')
  await setState(QueueState.waiting)
  const allPlayers = (await collections.queueSlots.find({ player: { $ne: null } }).toArray()).map(
    slot => slot.player!.steamId,
  )
  await unready(...allPlayers)
}
