import { nanoid } from 'nanoid'
import { collections } from '../../../database/collections'
import type { CaptainPoolModel } from '../../../database/models/captain-pool.model'
import type { QueueModel } from '../../../database/models/queue.model'
import { QueueState } from '../../../database/models/queue-state.model'
import { preReady } from '../../../pre-ready'
import type { Emit } from '../../queue-command'
import { readyTimers } from './ready-timers'
import { writeState } from './write-state'

// The player who filled the pool (queueState.last) is readied along with the pre-readied ones.
export async function toReady(queue: QueueModel, emit: Emit, pool: readonly CaptainPoolModel[]) {
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
  await writeState(queue._id, emit, QueueState.ready, captainReady)
  if (last && pool.some(member => member.player.steamId === last)) {
    await preReady.start(last)
  }
  await readyTimers.start(queue._id, captainReady)
  emit('queue/captainPool:updated', { queue: queue._id })
}
