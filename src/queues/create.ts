import { ObjectId } from 'mongodb'
import type { z } from 'zod'
import { activityLog } from '../activity-log'
import { collections } from '../database/collections'
import type { MapPoolEntry } from '../database/models/map-pool-entry.model'
import { createQueueSchema, type QueueId, type QueueModel } from '../database/models/queue.model'
import { errors } from '../errors'
import { events } from '../events'
import type { SteamId64 } from '../shared/types/steam-id-64'

/**
 * Adds a disabled queue at the end of the list.
 * @throws {ZodError}
 */
export async function create(
  input: z.input<typeof createQueueSchema>,
  maps: MapPoolEntry[],
  actor: SteamId64,
): Promise<QueueModel> {
  const parsed = createQueueSchema.parse(input)
  if (await collections.queues.countDocuments({ slug: parsed.slug })) {
    throw errors.conflict(`queue ${parsed.slug} already exists`)
  }

  const last = await collections.queues.findOne({}, { sort: { position: -1 } })
  const queue: QueueModel = {
    ...parsed,
    _id: new ObjectId() as QueueId,
    position: (last?.position ?? -1) + 1,
    enabled: false,
    maps,
  }
  await collections.queues.insertOne(queue)
  await activityLog.record({ type: 'configuration change', key: `queues.${queue.slug}`, actor })
  events.emit('queue:updated', { queue: queue._id })
  return queue
}
