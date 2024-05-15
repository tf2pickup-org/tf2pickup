import { collections } from '../database/collections'
import { QueueState } from '../database/models/queue-state.model'

export async function getState(): Promise<QueueState> {
  const state = await collections.queueState.findOne()
  if (!state) {
    throw new Error('queue state unavailable')
  }

  return state.state
}
