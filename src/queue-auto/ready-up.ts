import { collections } from '../database/collections'
import type { QueueSlotModel } from '../database/models/queue-slot.model'
import { QueueState } from '../database/models/queue-state.model'
import { events } from '../events'
import { logger } from '../logger'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { getState } from '../queue/get-state'
import { withQueueLock } from '../queue/with-queue-lock'
import { preReady } from '../pre-ready'
import { errors } from '../errors'

export async function readyUp(steamId: SteamId64): Promise<QueueSlotModel> {
  logger.trace({ steamId }, 'queue.readyUp()')
  const current = await collections.queueSlots.findOne({ 'player.steamId': steamId })
  if (!current) {
    throw errors.badRequest(`player not in queue: ${steamId}`)
  }
  const gamemode = current.gamemode

  return await withQueueLock(gamemode, 'ready-up', async () => {
    const state = await getState(gamemode)
    if (state !== QueueState.ready) {
      throw errors.badRequest('wrong queue state')
    }

    const slot = await collections.queueSlots.findOneAndUpdate(
      { gamemode, 'player.steamId': steamId },
      { $set: { ready: true } },
      { returnDocument: 'after' },
    )
    if (!slot) {
      throw errors.badRequest(`player not in queue: ${steamId}`)
    }

    events.emit('queue/slots:updated', { gamemode, slots: [slot] })
    await preReady.start(steamId)
    return slot
  })
}
