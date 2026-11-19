import { secondsToMilliseconds } from 'date-fns'
import { collections } from '../../../database/collections'
import type { CaptainDraftModel } from '../../../database/models/captain-draft.model'
import type { QueueModel } from '../../../database/models/queue.model'
import { QueueState } from '../../../database/models/queue-state.model'
import { preReady } from '../../../pre-ready'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import type { Emit } from '../../queue-command'
import { captainDraftMetrics } from '../metrics'
import { legalPicksCache } from './legal-picks-cache'
import { readyTimers } from './ready-timers'
import { turnTimer } from './turn-timer'
import { writeState } from './write-state'

// The one way back to waiting, from any state: ends the ready-up or the draft (whatever runs),
// drops the players in `remove` and returns everyone else with their sign-ups intact.
export async function toWaiting(
  queue: QueueModel,
  emit: Emit,
  {
    draft,
    remove = [],
    failed = false,
  }: { draft?: CaptainDraftModel; remove?: readonly SteamId64[]; failed?: boolean } = {},
) {
  if (failed) {
    // as in auto launchFailed: only returning draft members lose pre-ready
    const returning = await collections.captainPool
      .find({ queue: queue._id, locked: true })
      .toArray()
    for (const member of returning) await preReady.cancel(member.player.steamId)
  }
  await readyTimers.stop(queue._id)
  await turnTimer.stop(queue._id)
  legalPicksCache.delete(queue._id.toHexString())
  if (remove.length) {
    await collections.captainPool.deleteMany({
      queue: queue._id,
      'player.steamId': { $in: [...remove] },
    })
    for (const player of remove) emit('queue/captainPool:left', { queue: queue._id, player })
  }
  await collections.captainPool.updateMany(
    { queue: queue._id },
    { $set: { locked: false, ready: false } },
  )
  await collections.captainDrafts.deleteMany({ queue: queue._id })
  if (draft) {
    captainDraftMetrics.duration.record(
      Math.max(0, Date.now() - draft.startedAt.getTime()) / secondsToMilliseconds(1),
    )
  }
  await writeState(queue._id, emit, QueueState.waiting)
  emit('queue/captainPool:updated', { queue: queue._id })
}
