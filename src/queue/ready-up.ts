import { collections } from '../database/collections'
import type { QueueSlotModel } from '../database/models/queue-slot.model'
import { QueueState } from '../database/models/queue-state.model'
import { events } from '../events'
import { logger } from '../logger'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { getState } from './get-state'
import { mutex } from './mutex'
import { preReady } from '../pre-ready'
import { errors } from '../errors'
import { queueMutexWaitDuration } from './metrics'
import { performance } from 'perf_hooks'

export async function readyUp(steamId: SteamId64): Promise<QueueSlotModel> {
  const waitStart = performance.now()
  return await mutex.runExclusive(async () => {
    queueMutexWaitDuration.record((performance.now() - waitStart) / 1000, { operation: 'readyup' })
    logger.trace({ steamId }, 'queue.readyUp()')
    const state = await getState()
    if (state !== QueueState.ready) {
      throw errors.badRequest('wrong queue state')
    }

    const slot = await collections.queueSlots.findOneAndUpdate(
      { 'player.steamId': steamId },
      { $set: { ready: true } },
      { returnDocument: 'after' },
    )
    if (!slot) {
      throw errors.badRequest(`player not in queue: ${steamId}`)
    }

    events.emit('queue/slots:updated', { slots: [slot] })
    await preReady.start(steamId)
    return slot
  })
}
