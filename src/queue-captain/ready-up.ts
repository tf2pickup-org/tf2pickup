import { collections } from '../database/collections'
import type { QueuePlayerModel } from '../database/models/queue-player.model'
import { QueueState } from '../database/models/queue-state.model'
import { errors } from '../errors'
import { events } from '../events'
import { preReady } from '../pre-ready'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { getState } from '../queue/get-state'
import { withQueueLock } from '../queue/with-queue-lock'

export async function readyUp(steamId: SteamId64): Promise<QueuePlayerModel> {
  return await withQueueLock('captain.readyUp', async () => {
    const state = await getState()
    if (state !== QueueState.ready) {
      throw errors.badRequest('invalid queue state')
    }

    const player = await collections.queuePlayers.findOneAndUpdate(
      { steamId },
      { $set: { ready: true } },
      { returnDocument: 'after' },
    )

    if (!player) {
      throw errors.badRequest('player not in the queue')
    }

    const allPlayers = await collections.queuePlayers.find({}).toArray()
    events.emit('queue/players:updated', { players: allPlayers })
    await preReady.start(steamId)
    return player
  })
}
