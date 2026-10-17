import { activityLog } from '../activity-log'
import { collections } from '../database/collections'
import type { QueueId } from '../database/models/queue.model'
import { errors } from '../errors'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { get } from './get'

export async function remove(id: QueueId, actor: SteamId64) {
  const queue = await get(id)
  if (queue.enabled) {
    throw errors.badRequest('disable the queue before deleting it')
  }

  await collections.queues.deleteOne({ _id: id })
  await activityLog.record({ type: 'configuration change', key: `queues.${queue.slug}`, actor })
}
