import { activityLog } from '../activity-log'
import { collections } from '../database/collections'
import { mapPoolSchema } from '../database/models/map-pool-entry.model'
import type { QueueId } from '../database/models/queue.model'
import { errors } from '../errors'
import { events } from '../events'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { reset } from './auto/reset'
import { get } from './get'

export async function enable(id: QueueId, actor: SteamId64) {
  const queue = await get(id)
  if (queue.enabled) {
    return
  }

  if (!mapPoolSchema.safeParse(queue.maps).success) {
    throw errors.badRequest('a queue needs at least 3 maps in its map pool')
  }

  await collections.queues.updateOne({ _id: id }, { $set: { enabled: true } })
  // ponytail: every queue launches automatically for now
  await reset(id)
  await activityLog.record({
    type: 'configuration change',
    key: `queues.${queue.slug}.enabled`,
    actor,
  })
  events.emit('queue:updated', { queue: id })
}
