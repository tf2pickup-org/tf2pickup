import SteamAPI from 'steamapi'
import { subDays } from 'date-fns'
import { collections } from '../database/collections'
import { environment } from '../environment'
import { logger } from '../logger'
import { steamId64 } from '../shared/schemas/steam-id-64'

const steamApi = new SteamAPI(environment.STEAM_API_KEY)

// Steam's GetPlayerSummaries accepts up to 100 steam ids per request, so one
// batch is a single API call.
const batchSize = 100

// How long a synced avatar is considered fresh before it is refreshed again.
const staleAfterDays = 7

/**
 * Refresh stored player avatars from Steam, one batch per call.
 *
 * Players are picked oldest-first by `avatarLastSyncedAt`, so accounts that have
 * never been synced (e.g. those the avatar backfill migration could not reach,
 * which currently fall back to the default avatar) are prioritised, followed by
 * the players whose avatars are the most stale.
 *
 * Avatars are written directly to the collection (no `player:updated` event) to
 * avoid triggering downstream listeners on a routine refresh.
 */
export async function syncAvatars() {
  const staleThreshold = subDays(new Date(), staleAfterDays)
  const candidates = await collections.players
    .find(
      {
        $or: [
          { avatarLastSyncedAt: { $exists: false } },
          { avatarLastSyncedAt: { $lt: staleThreshold } },
        ],
      },
      { projection: { steamId: 1 }, sort: { avatarLastSyncedAt: 1 }, limit: batchSize },
    )
    .toArray()

  if (candidates.length === 0) {
    return
  }

  const steamIds = candidates.map(p => p.steamId)
  const now = new Date()

  let summaries: Awaited<ReturnType<typeof steamApi.getUserSummary>>
  try {
    summaries = await steamApi.getUserSummary(steamIds)
  } catch (error) {
    logger.warn({ error }, 'failed to fetch Steam summaries while syncing avatars')
    return
  }

  const summaryArray = Array.isArray(summaries) ? summaries : [summaries]

  for (const summary of summaryArray) {
    await collections.players.updateOne(
      { steamId: steamId64.parse(summary.steamID) },
      {
        $set: {
          avatar: {
            small: summary.avatar.small,
            medium: summary.avatar.medium,
            large: summary.avatar.large,
          },
          avatarLastSyncedAt: now,
        },
      },
    )
  }

  // Mark players Steam returned no summary for (deleted / banned / private
  // accounts) as synced too, so they don't keep sorting first and starving the
  // rest of the player base on every cycle.
  const syncedIds = new Set(summaryArray.map(summary => steamId64.parse(summary.steamID)))
  const notReturned = steamIds.filter(steamId => !syncedIds.has(steamId))
  if (notReturned.length > 0) {
    await collections.players.updateMany(
      { steamId: { $in: notReturned } },
      { $set: { avatarLastSyncedAt: now } },
    )
  }

  logger.debug(
    { requested: steamIds.length, updated: summaryArray.length, skipped: notReturned.length },
    'synced player avatars',
  )
}
