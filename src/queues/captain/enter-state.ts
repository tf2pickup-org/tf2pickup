import { nanoid } from 'nanoid'
import { collections } from '../../database/collections'
import type { CaptainPoolModel } from '../../database/models/captain-pool.model'
import type { QueueModel } from '../../database/models/queue.model'
import { QueueState } from '../../database/models/queue-state.model'
import { logger } from '../../logger'
import { preReady } from '../../pre-ready'
import { tasks } from '../../tasks'
import type { Emit } from '../queue-command'
import { assertCaptainQueue } from './assert-captain-queue'
import { cancelReadyTimeouts } from './cancel-ready-timeouts'
import { startDraft } from './start-draft'

// The caller holds queueCommand's lock and supplies its existing pool/settings snapshot. The player
// who filled the pool (queueState.last) is readied along with the pre-readied ones.
export async function enterState(
  queue: QueueModel,
  state: QueueState.waiting | QueueState.ready | QueueState.drafting,
  emit: Emit,
  pool: CaptainPoolModel[] = [],
) {
  assertCaptainQueue(queue)
  logger.info({ queue: queue._id, state }, 'captain queue state changed')

  if (state === QueueState.ready) {
    const startedAt = new Date()
    const captainReady = {
      token: nanoid(),
      startedAt,
      readyUpDeadline: new Date(startedAt.getTime() + queue.readyUpTimeout),
      deadline: new Date(startedAt.getTime() + queue.readyStateTimeout),
    }
    const last = (await collections.queueState.findOne({ queue: queue._id }))?.last
    const preReadied = await collections.players
      .find(
        {
          steamId: { $in: pool.map(member => member.player.steamId) },
          preReadyUntil: { $gte: startedAt },
        },
        { projection: { steamId: 1 } },
      )
      .toArray()
    const ready = new Set([...preReadied.map(player => player.steamId), ...(last ? [last] : [])])
    await collections.captainPool.updateMany(
      { queue: queue._id, 'player.steamId': { $in: [...ready] } },
      { $set: { ready: true } },
    )
    await collections.queueState.updateOne({ queue: queue._id }, { $set: { state, captainReady } })
    if (last && pool.some(member => member.player.steamId === last)) {
      await preReady.start(last)
    }
    await tasks.schedule(
      'queue/captain:readyUpTimeout',
      Math.max(0, captainReady.readyUpDeadline.getTime() - Date.now()),
      {
        queue: queue._id,
        token: captainReady.token,
      },
    )
    await tasks.schedule(
      'queue/captain:readyStateTimeout',
      Math.max(0, captainReady.deadline.getTime() - Date.now()),
      {
        queue: queue._id,
        token: captainReady.token,
      },
    )
  } else {
    await cancelReadyTimeouts(queue._id)
    await collections.captainPool.updateMany(
      { queue: queue._id },
      state === QueueState.waiting ? { $set: { ready: false } } : { $set: { locked: true } },
    )
    await collections.queueState.updateOne(
      { queue: queue._id },
      { $set: { state }, $unset: { captainReady: 1, last: 1 } },
    )
  }
  emit('queue/captainPool:updated', { queue: queue._id })
  emit('queue/state:updated', { queue: queue._id, state })
  if (state === QueueState.drafting) {
    emit('queue/captainDraft:starting', { queue: queue._id })
    await startDraft(
      queue,
      pool.map(member => ({ ...member, locked: true })),
      emit,
    )
  }
}
