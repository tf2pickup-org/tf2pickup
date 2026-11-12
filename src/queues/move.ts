import { collections } from '../database/collections'
import type { QueueId } from '../database/models/queue.model'
import { events } from '../events'
import { get } from './get'

// Swaps the queue with its neighbour in the list.
export async function move(id: QueueId, direction: 'up' | 'down') {
  const queue = await get(id)
  const neighbour = await collections.queues.findOne(
    { position: direction === 'up' ? { $lt: queue.position } : { $gt: queue.position } },
    { sort: { position: direction === 'up' ? -1 : 1 } },
  )
  if (!neighbour) {
    return
  }

  await collections.queues.updateOne({ _id: id }, { $set: { position: neighbour.position } })
  await collections.queues.updateOne({ _id: neighbour._id }, { $set: { position: queue.position } })
  events.emit('queue:updated', { queue: id })
}
