import { collections } from '../database/collections'
import type { QueueSlotModel } from '../database/models/queue-slot.model'
import { QueueState } from '../database/models/queue-state.model'
import { events } from '../events'
import { logger } from '../logger'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { getMapVoteResults } from './get-map-vote-results'
import { getState } from './get-state'
import { mutex } from './mutex'
import { preReady } from '../pre-ready'

export async function kick(...steamIds: SteamId64[]): Promise<QueueSlotModel[]> {
  return await mutex.runExclusive(async () => {
    logger.trace({ steamIds }, 'queue.kick()')
    const state = await getState()
    if (state === QueueState.launching) {
      throw new Error('invalid queue state')
    }

    const slots: QueueSlotModel[] = []
    for (const steamId of steamIds) {
      const slot = await collections.queueSlots.findOneAndUpdate(
        {
          player: steamId,
        },
        {
          $set: { player: null, ready: false },
        },
        {
          returnDocument: 'after',
        },
      )

      if (!slot) {
        continue
      }

      slots.push(slot)
    }

    if (slots.length > 0) {
      events.emit('queue/slots:updated', { slots })
      await collections.queueMapVotes.deleteMany({ player: { $in: steamIds } })
      events.emit('queue/mapVoteResults:updated', { results: await getMapVoteResults() })

      const friendships = await collections.queueFriends
        .find({ source: { $in: steamIds } })
        .toArray()
      for (const friendship of friendships) {
        await collections.queueFriends.deleteOne({ source: friendship.source })
        events.emit('queue/friendship:removed', {
          source: friendship.source,
          target: friendship.target,
        })
      }
      for (const steamId of steamIds) {
        await preReady.cancel(steamId)
      }
    }

    return slots
  })
}
