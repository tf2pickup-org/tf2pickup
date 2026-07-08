import { secondsToMilliseconds } from 'date-fns'
import { collections } from '../database/collections'
import { GameState } from '../database/models/game.model'
import { environment } from '../environment'
import { logger } from '../logger'
import { currentGamemode } from '../shared/current-gamemode'
import { version } from '../version'

export async function sendHeartbeat() {
  if (!environment.ATLAS_SECRET) {
    return
  }

  const [occupied, capacity, onlinePlayers, liveGames] = await Promise.all([
    collections.queueSlots.countDocuments({ player: { $ne: null } }),
    collections.queueSlots.countDocuments(),
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
        config: currentGamemode,
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
