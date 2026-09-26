import { groupBy } from 'es-toolkit'
import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import type { QueueSlotModel } from '../../database/models/queue-slot.model'
import { QueueState } from '../../database/models/queue-state.model'
import { events } from '../../events'
import { logger } from '../../logger'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { getMapVoteResults } from './get-map-vote-results'
import { getState } from '../get-state'
import { withQueueLock } from '../with-queue-lock'
import { preReady } from '../../pre-ready'
import { errors } from '../../errors'
import { withLogLevel } from '../../utils/with-log-level'

export async function kick(...steamIds: SteamId64[]): Promise<QueueSlotModel[]> {
  logger.trace({ steamIds }, 'queue.kick()')
  const occupied = await collections.queueSlots
    .find({ 'player.steamId': { $in: steamIds } })
    .toArray()
  const byQueue = groupBy(occupied, slot => slot.queue.toHexString())

  const kicked: QueueSlotModel[] = []
  for (const slots of Object.values(byQueue)) {
    kicked.push(
      ...(await kickFromQueue(
        slots[0]!.queue,
        slots.map(({ player }) => player!.steamId),
      )),
    )
  }
  return kicked
}

async function kickFromQueue(queue: QueueId, steamIds: SteamId64[]): Promise<QueueSlotModel[]> {
  return await withQueueLock(queue, 'kick', async () => {
    const state = await getState(queue)
    if (state === QueueState.launching) {
      throw withLogLevel(errors.badRequest('invalid queue state'), 'debug')
    }

    const slots: QueueSlotModel[] = []
    for (const steamId of steamIds) {
      const slot = await collections.queueSlots.findOneAndUpdate(
        { queue, 'player.steamId': steamId },
        { $set: { player: null, ready: false } },
        { returnDocument: 'after' },
      )

      if (!slot) {
        continue
      }

      events.emit('queue:playerKicked', { player: steamId })
      slots.push(slot)
    }

    if (slots.length > 0) {
      events.emit('queue/slots:updated', { queue, slots })
      await collections.queueMapVotes.deleteMany({ queue, player: { $in: steamIds } })
      events.emit('queue/mapVoteResults:updated', {
        queue,
        results: await getMapVoteResults(queue),
      })
      for (const steamId of steamIds) {
        await preReady.cancel(steamId)
      }
    }

    return slots
  })
}
