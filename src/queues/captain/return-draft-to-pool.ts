import { secondsToMilliseconds } from 'date-fns'
import { collections } from '../../database/collections'
import type { CaptainDraftModel } from '../../database/models/captain-draft.model'
import type { QueueModel } from '../../database/models/queue.model'
import { QueueState } from '../../database/models/queue-state.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { preReady } from '../../pre-ready'
import { tasks } from '../../tasks'
import type { Emit } from '../queue-command'
import { legalPicksCache } from './legal-picks-cache'
import { captainDraftMetrics } from './metrics'

// Must run inside queueCommand(). Unpicked and next-game members retain all signup fields.
export async function returnDraftToPool(
  queue: QueueModel,
  draft: CaptainDraftModel,
  emit: Emit,
  remove: readonly SteamId64[] = [],
  failed = false,
) {
  if (failed) {
    // As in auto launchFailed: only returning draft members lose pre-ready.
    const returning = await collections.captainPool
      .find({ queue: queue._id, locked: true })
      .toArray()
    for (const member of returning) await preReady.cancel(member.player.steamId)
  }
  await tasks.cancel('queue/captain:turnTimeout', { queue: queue._id })
  if (remove.length) {
    await collections.captainPool.deleteMany({
      queue: queue._id,
      'player.steamId': { $in: remove },
    })
    for (const player of remove) emit('queue/captainPool:left', { queue: queue._id, player })
  }
  await collections.captainPool.updateMany(
    { queue: queue._id },
    { $set: { locked: false, ready: false } },
  )
  await collections.captainDrafts.deleteOne({ queue: queue._id, token: draft.token })
  await collections.queueState.updateOne(
    { queue: queue._id },
    { $set: { state: QueueState.waiting }, $unset: { captainReady: 1, last: 1 } },
  )
  legalPicksCache.delete(queue._id.toHexString())
  captainDraftMetrics.duration.record(
    Math.max(0, Date.now() - draft.startedAt.getTime()) / secondsToMilliseconds(1),
  )
  emit('queue/captainPool:updated', { queue: queue._id })
  emit('queue/state:updated', { queue: queue._id, state: QueueState.waiting })
}
