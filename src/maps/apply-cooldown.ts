import { collections } from '../database/collections'
import type { QueueId } from '../database/models/queue.model'
import { logger } from '../logger'
import { get } from '../queues/get'

export async function applyMapCooldown(queue: QueueId, map: string) {
  logger.trace({ queue, map }, 'queue.applyMapCooldown()')
  await collections.queues.updateOne(
    { _id: queue },
    { $inc: { 'maps.$[other].cooldown': -1 } },
    { arrayFilters: [{ 'other.name': { $ne: map }, 'other.cooldown': { $gt: 0 } }] },
  )
  const { mapCooldown } = await get(queue)
  await collections.queues.updateOne(
    { _id: queue, 'maps.name': map },
    { $set: { 'maps.$.cooldown': mapCooldown } },
  )
}
