import { activityLog } from '../activity-log'
import { collections } from '../database/collections'
import type { QueueId } from '../database/models/queue.model'
import { errors } from '../errors'
import { events } from '../events'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { tasks } from '../tasks'
import { kick } from './auto/kick'
import { get } from './get'
import { withQueueLock } from './with-queue-lock'

export async function disable(id: QueueId, actor: SteamId64) {
  const queue = await get(id)
  if (!queue.enabled) {
    return
  }

  if ((await collections.queues.countDocuments({ enabled: true })) <= 1) {
    throw errors.badRequest('at least one queue must stay enabled')
  }

  await collections.queues.updateOne({ _id: id }, { $set: { enabled: false } })
  const players = (
    await collections.queueSlots.find({ queue: id, player: { $ne: null } }).toArray()
  ).map(({ player }) => player!.steamId)
  await kick(...players)

  await withQueueLock(id, 'disable', async () => {
    await tasks.cancel('queue:readyUpTimeout', { queue: id })
    await tasks.cancel('queue:unready', { queue: id })
    await Promise.all([
      collections.queueSlots.deleteMany({ queue: id }),
      collections.queueState.deleteMany({ queue: id }),
      collections.queueMapOptions.deleteMany({ queue: id }),
      collections.queueMapVotes.deleteMany({ queue: id }),
      collections.queueFriends.deleteMany({ queue: id }),
    ])
  })

  await activityLog.record({
    type: 'configuration change',
    key: `queues.${queue.slug}.enabled`,
    actor,
  })
  events.emit('queue:updated', { queue: id })
}
