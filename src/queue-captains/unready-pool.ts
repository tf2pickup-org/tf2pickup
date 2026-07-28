import { collections } from '../database/collections'
import { QueueState } from '../database/models/queue-state.model'
import { events } from '../events'
import { logger } from '../logger'
import { setState } from '../queue/set-state'
import { getPool } from './get-pool'

// Back to square one: the queue stays, everyone's classes stay, only the ready flags are dropped.
export async function unreadyPool() {
  logger.info('unready captains pool')
  await setState(QueueState.waiting)
  await collections.queueCaptainsPool.updateMany({}, { $set: { ready: false } })
  events.emit('queueCaptains/pool:updated', { entries: await getPool() })
}
