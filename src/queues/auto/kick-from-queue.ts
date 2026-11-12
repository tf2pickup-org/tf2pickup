import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import type { QueueSlotModel } from '../../database/models/queue-slot.model'
import { QueueState } from '../../database/models/queue-state.model'
import { errors } from '../../errors'
import { preReady } from '../../pre-ready'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { withLogLevel } from '../../utils/with-log-level'
import { getState } from '../get-state'
import { getMapVoteResults } from './get-map-vote-results'
import type { Emit } from './queue-command'

// must run inside queueCommand()
export async function kickFromQueue(
  queue: QueueId,
  steamIds: SteamId64[],
  emit: Emit,
): Promise<QueueSlotModel[]> {
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

    emit('queue:playerKicked', { player: steamId })
    slots.push(slot)
  }

  if (slots.length > 0) {
    emit('queue/slots:updated', { queue, slots })
    await collections.queueMapVotes.deleteMany({ queue, player: { $in: steamIds } })
    emit('queue/mapVoteResults:updated', {
      queue,
      results: await getMapVoteResults(queue),
    })
    for (const steamId of steamIds) {
      await preReady.cancel(steamId)
    }
  }

  return slots
}
