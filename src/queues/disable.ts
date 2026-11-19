import { activityLog } from '../activity-log'
import { collections } from '../database/collections'
import type { QueueId } from '../database/models/queue.model'
import { QueueState } from '../database/models/queue-state.model'
import { errors } from '../errors'
import { events } from '../events'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { engines } from './engines'
import { get } from './get'

export async function disable(id: QueueId, actor: SteamId64) {
  const queue = await get(id)
  if (!queue.enabled) {
    return
  }

  if ((await collections.queues.countDocuments({ enabled: true })) <= 1) {
    throw errors.badRequest('at least one queue must stay enabled')
  }

  if ((await collections.queueState.findOne({ queue: id }))?.state === QueueState.launching) {
    throw errors.badRequest('the queue is launching a game')
  }

  await collections.queues.updateOne({ _id: id }, { $set: { enabled: false } })
  try {
    await engines[queue.launchMode].teardown(id)
  } catch (error) {
    // a launch started after the check above
    await collections.queues.updateOne({ _id: id }, { $set: { enabled: true } })
    throw error
  }

  await activityLog.record({
    type: 'configuration change',
    key: `queues.${queue.slug}.enabled`,
    actor,
  })
  events.emit('queue:updated', { queue: id })
}
