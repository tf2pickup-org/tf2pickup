import { collections } from '../database/collections'
import type { QueueId } from '../database/models/queue.model'
import { QueueState } from '../database/models/queue-state.model'
import { errors } from '../errors'

export async function getState(queue: QueueId): Promise<QueueState> {
  const state = await collections.queueState.findOne({ queue })
  if (!state) {
    throw errors.internalServerError('queue state unavailable')
  }

  return state.state
}
