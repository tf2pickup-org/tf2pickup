import { collections } from '../database/collections'
import { QueueState } from '../database/models/queue-state.model'
import { events } from '../events'

export async function setState(state: QueueState) {
  await collections.queueState.updateOne({}, { $set: { state } })
  events.emit('queue/state:updated', { state })
}
