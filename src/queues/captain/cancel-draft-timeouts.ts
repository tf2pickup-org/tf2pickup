import type { QueueId } from '../../database/models/queue.model'
import { tasks } from '../../tasks'
import { legalPicksCache } from './legal-picks-cache'

// Call inside queueCommand, on every exit of a draft (also the ones to come).
export async function cancelDraftTimeouts(queue: QueueId) {
  legalPicksCache.delete(queue.toHexString())
  await tasks.cancel('queue/captain:turnTimeout', { queue })
}
