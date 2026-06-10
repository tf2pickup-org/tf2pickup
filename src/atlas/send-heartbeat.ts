import { secondsToMilliseconds } from 'date-fns'
import { collections } from '../database/collections'
import { environment } from '../environment'
import { logger } from '../logger'
import { version } from '../version'

export async function sendHeartbeat() {
  if (!environment.ATLAS_SECRET) {
    return
  }

  const [occupied, capacity, onlinePlayers] = await Promise.all([
    collections.queueSlots.countDocuments({ player: { $ne: null } }),
    collections.queueSlots.countDocuments(),
    collections.onlinePlayers.countDocuments(),
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
        config: environment.QUEUE_CONFIG,
        occupied,
        capacity,
      },
      onlinePlayers,
    }),
    signal: AbortSignal.timeout(secondsToMilliseconds(10)),
  })

  if (!response.ok) {
    logger.warn({ status: response.status }, 'atlas heartbeat rejected')
  }
}
