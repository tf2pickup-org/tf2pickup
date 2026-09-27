import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import { QueueState } from '../../database/models/queue-state.model'
import { logger } from '../../logger'
import { queueCommand } from './queue-command'
import { reset } from './reset'
import { takeLaunchSnapshot } from './take-launch-snapshot'

// brings a queue back after the app (re)starts
export async function recover(queue: QueueId) {
  const [state, slots] = await Promise.all([
    collections.queueState.findOne({ queue }),
    collections.queueSlots.countDocuments({ queue }),
  ])

  // a queue enabled outside the app (e.g. by the merge script) has no slots yet
  if (!state || slots === 0) {
    logger.info({ queue }, 'queue not initialized, resetting')
    await reset(queue)
    return
  }

  // the app went down mid-launch
  if (state.state === QueueState.launching) {
    logger.info({ queue }, 'queue was launching, launching again')
    await queueCommand('recover', async emit => {
      emit('queue:launching', await takeLaunchSnapshot(queue))
    })
  }
}
