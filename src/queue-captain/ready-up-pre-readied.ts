import { collections } from '../database/collections'
import type { PlayerModel } from '../database/models/player.model'
import { events } from '../events'

export async function readyUpPreReadied(): Promise<void> {
  const preReadiedPlayers = await collections.players
    .find<Pick<PlayerModel, 'steamId'>>(
      { preReadyUntil: { $gte: new Date() } },
      { projection: { steamId: 1 } },
    )
    .toArray()
  if (preReadiedPlayers.length === 0) {
    return
  }

  const { modifiedCount } = await collections.queuePlayers.updateMany(
    { steamId: { $in: preReadiedPlayers.map(({ steamId }) => steamId) } },
    { $set: { ready: true } },
  )
  if (modifiedCount === 0) {
    return
  }

  const players = await collections.queuePlayers.find({}).toArray()
  events.emit('queue/players:updated', { players })
}
