import { createHash } from 'node:crypto'
import { secondsToMilliseconds, subDays } from 'date-fns'
import { environment } from '../environment'
import { logger } from '../logger'
import { getActivePlayers } from '../statistics/get-active-players'
import type { SteamId64 } from '../shared/types/steam-id-64'

const activeWindowDays = 30

/**
 * Hashes a steam id into the stable, instance-independent player id atlas uses
 * to deduplicate active players across instances. The scheme must match every
 * other instance (plain SHA-256, no per-instance salt), otherwise the same
 * player would be counted more than once.
 */
function toPlayerId(steamId: SteamId64): string {
  return createHash('sha256').update(steamId).digest('hex')
}

/**
 * Reports the players active on this instance in the last 30 days to atlas, so
 * it can show the number of distinct players across all pickups. The full set
 * is sent every time; atlas keeps the most recent activity per player, so
 * re-sending is idempotent.
 */
export async function sendActivePlayers() {
  if (!environment.ATLAS_SECRET) {
    return
  }

  const players = await getActivePlayers(subDays(new Date(), activeWindowDays))
  if (players.length === 0) {
    return
  }

  const response = await fetch(new URL('/api/active-players', environment.ATLAS_URL), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${environment.ATLAS_SECRET}`,
    },
    body: JSON.stringify({
      url: environment.WEBSITE_URL,
      players: players.map(({ steamId, lastActiveAt }) => ({
        id: toPlayerId(steamId),
        lastActiveAt: lastActiveAt.toISOString(),
      })),
    }),
    signal: AbortSignal.timeout(secondsToMilliseconds(30)),
  })

  if (!response.ok) {
    logger.warn({ status: response.status }, 'atlas active players rejected')
  }
}
