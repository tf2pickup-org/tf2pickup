import { secondsToMilliseconds } from 'date-fns'
import { environment } from '../environment'
import { logger } from '../logger'
import { getGameLaunchesPerDay } from '../statistics/get-game-launches-per-day'

/**
 * Reports this instance's daily game launch counts to atlas. Without `since`
 * the full history is sent (used on boot to backfill); atlas overwrites each
 * day, so re-sending is idempotent.
 */
export async function sendActivity(since?: Date) {
  if (!environment.ATLAS_SECRET) {
    return
  }

  const launches = await getGameLaunchesPerDay(since)
  if (launches.length === 0) {
    return
  }

  const response = await fetch(new URL('/api/activity', environment.ATLAS_URL), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${environment.ATLAS_SECRET}`,
    },
    body: JSON.stringify({
      url: environment.WEBSITE_URL,
      days: launches.map(({ day, count }) => ({ day, gamesLaunched: count })),
    }),
    signal: AbortSignal.timeout(secondsToMilliseconds(30)),
  })

  if (!response.ok) {
    logger.warn({ status: response.status }, 'atlas activity rejected')
  }
}
