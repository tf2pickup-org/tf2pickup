import { nanoid } from 'nanoid'
import { collections } from '../../database/collections'
import type { CaptainPoolModel } from '../../database/models/captain-pool.model'
import type { QueueModel } from '../../database/models/queue.model'
import { QueueState } from '../../database/models/queue-state.model'
import { logger } from '../../logger'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { tasks } from '../../tasks'
import type { Emit } from '../auto/queue-command'
import { assertCaptainQueue } from './assert-captain-queue'
import { cancelReadyTimeouts } from './cancel-ready-timeouts'

// The caller holds queueCommand's lock and supplies its existing pool/settings snapshot.
export async function enterState(
  queue: QueueModel,
  state: QueueState.waiting | QueueState.ready | QueueState.drafting,
  emit: Emit,
  pool: CaptainPoolModel[] = [],
  last?: SteamId64,
): Promise<CaptainPoolModel[]> {
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
    pool = pool.map(member => ({
      ...member,
      ready: member.ready || ready.has(member.player.steamId),
    }))
    await collections.queueState.updateOne({ queue: queue._id }, { $set: { state, captainReady } })
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
      { $set: { state }, $unset: { captainReady: 1 } },
    )
  }
  emit('queue/captainPool:updated', { queue: queue._id })
  emit('queue/state:updated', { queue: queue._id, state })
  if (state === QueueState.drafting) {
    emit('queue/captainDraft:starting', { queue: queue._id })
  }
  return pool
}
