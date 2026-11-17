import { collections } from '../../database/collections'
import type { QueueModel } from '../../database/models/queue.model'
import { QueueState } from '../../database/models/queue-state.model'
import { logger } from '../../logger'
import { tasks } from '../../tasks'
import { queueCommand } from '../auto/queue-command'
import { scheduleTurnTimeout } from './settle-draft'

// Brings a draft back after the app (re)starts: the turn timer is scheduled again from the saved
// deadline, which fires at once when it has already passed.
export async function recoverDraft(queue: QueueModel) {
  await queueCommand('captain-recover-draft', async () => {
    const [state, draft] = await Promise.all([
      collections.queueState.findOne({ queue: queue._id }),
      collections.captainDrafts.findOne({ queue: queue._id }),
    ])
    if (state?.state !== QueueState.drafting || !draft) {
      return
    }

    logger.info({ queue: queue._id }, 'captain draft was running, resuming it')
    await tasks.cancel('queue/captain:turnTimeout', { queue: queue._id })
    await scheduleTurnTimeout(queue, draft)
  })
}
