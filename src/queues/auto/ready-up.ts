import { collections } from '../../database/collections'
import type { QueueSlotModel } from '../../database/models/queue-slot.model'
import { QueueState } from '../../database/models/queue-state.model'
import { events } from '../../events'
import { logger } from '../../logger'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { getState } from '../get-state'
import { withQueueLock } from '../with-queue-lock'
import { preReady } from '../../pre-ready'
import { errors } from '../../errors'

export async function readyUp(steamId: SteamId64): Promise<QueueSlotModel> {
  const current = await collections.queueSlots.findOne({ 'player.steamId': steamId })
  if (!current) {
    throw errors.badRequest(`player not in queue: ${steamId}`)
  }

  const { queue } = current
  return await withQueueLock(queue, 'ready-up', async () => {
    logger.trace({ queue, steamId }, 'queue.readyUp()')
    const state = await getState(queue)
    if (state !== QueueState.ready) {
      throw errors.badRequest('wrong queue state')
    }

    const slot = await collections.queueSlots.findOneAndUpdate(
      { queue, 'player.steamId': steamId },
      { $set: { ready: true } },
      { returnDocument: 'after' },
    )
    if (!slot) {
      throw errors.badRequest(`player not in queue: ${steamId}`)
    }

    events.emit('queue/slots:updated', { queue, slots: [slot] })
    await preReady.start(steamId)
    return slot
  })
}
