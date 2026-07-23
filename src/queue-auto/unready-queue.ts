import { collections } from '../database/collections'
import { QueueState } from '../database/models/queue-state.model'
import { logger } from '../logger'
import { setState } from '../queue/set-state'
import { unready } from './unready'

export async function unreadyQueue() {
  logger.info('unready queue')
  await setState(QueueState.waiting)
  const allPlayers = (await collections.queueSlots.find({ player: { $ne: null } }).toArray()).map(
    slot => slot.player!.steamId,
  )
  await unready(...allPlayers)
}
