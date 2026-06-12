import { collections } from '../database/collections'
import type { QueuePlayerModel } from '../database/models/queue-player.model'
import { events } from '../events'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { withQueueLock } from '../queue/with-queue-lock'

export async function unready(...steamIds: SteamId64[]): Promise<QueuePlayerModel[]> {
  return await withQueueLock('captain.unready', async () => {
    const updated: QueuePlayerModel[] = []
    for (const steamId of steamIds) {
      const player = await collections.queuePlayers.findOneAndUpdate(
        { steamId },
        { $set: { ready: false } },
        { returnDocument: 'after' },
      )
      if (player) updated.push(player)
    }

    if (updated.length > 0) {
      const allPlayers = await collections.queuePlayers.find({}).toArray()
      events.emit('queue/players:updated', { players: allPlayers })
    }

    return updated
  })
}
