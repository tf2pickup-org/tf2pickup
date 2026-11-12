import { collections } from '../database/collections'
import { QueueState } from '../database/models/queue-state.model'
import { errors } from '../errors'

export async function getState(): Promise<QueueState> {
  const state = await collections.queueState.findOne()
  if (!state) {
    throw errors.internalServerError('queue state unavailable')
  }

  return state.state
}
