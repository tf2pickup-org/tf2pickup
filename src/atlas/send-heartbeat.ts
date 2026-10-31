import { queues } from '../queues'
import { secondsToMilliseconds } from 'date-fns'
import { collections } from '../database/collections'
import { GameState } from '../database/models/game.model'
import { environment } from '../environment'
import { logger } from '../logger'
import { version } from '../version'

export async function sendHeartbeat() {
  if (!environment.ATLAS_SECRET) {
    return
  }

  // ponytail: atlas knows one queue per instance, so it gets the default one
  const queue = await queues.getDefault()
  const [occupied, capacity, onlinePlayers, liveGames] = await Promise.all([
    collections.queueSlots.countDocuments({ queue: queue._id, player: { $ne: null } }),
    collections.queueSlots.countDocuments({ queue: queue._id }),
    collections.onlinePlayers.countDocuments(),
    collections.games.countDocuments({
      state: {
        $in: [GameState.created, GameState.configuring, GameState.launching, GameState.started],
      },
    }),
  ])

  const response = await fetch(new URL('/api/heartbeat', environment.ATLAS_URL), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${environment.ATLAS_SECRET}`,
    },
    body: JSON.stringify({
      url: environment.WEBSITE_URL,
      name: environment.WEBSITE_NAME,
      version,
      queue: {
        config: queue.gamemode,
        occupied,
        capacity,
      },
      onlinePlayers,
      liveGames,
    }),
    signal: AbortSignal.timeout(secondsToMilliseconds(10)),
  })

  if (!response.ok) {
    logger.warn({ status: response.status }, 'atlas heartbeat rejected')
  }
}
