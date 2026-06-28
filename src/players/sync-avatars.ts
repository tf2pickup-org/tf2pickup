import SteamAPI from 'steamapi'
import { subDays } from 'date-fns'
import { collections } from '../database/collections'
import { environment } from '../environment'
import { logger } from '../logger'
import { steamId64 } from '../shared/schemas/steam-id-64'

const steamApi = new SteamAPI(environment.STEAM_API_KEY)

const batchSize = 100
const staleAfterDays = 7

export async function syncAvatars() {
  const candidates = await collections.players
    .find(
      {
        $or: [
          { avatarLastSyncedAt: { $exists: false } },
          { avatarLastSyncedAt: { $lt: subDays(new Date(), staleAfterDays) } },
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
    // steamapi throws when Steam returns no players at all (the whole batch is
    // deleted / banned / private). Treat that as an empty result so the batch
    // still gets marked as synced below and stops sorting first forever.
    if (error instanceof Error && error.message === 'No players found') {
      summaries = []
    } else {
      logger.info({ error }, 'failed to fetch Steam summaries while syncing avatars')
      return
    }
  }

  const summaryArray = Array.isArray(summaries) ? summaries : [summaries]

  type AvatarSyncOp = Parameters<typeof collections.players.bulkWrite>[0][number]
  const operations: AvatarSyncOp[] = summaryArray.map(summary => ({
    updateOne: {
      filter: { steamId: steamId64.parse(summary.steamID) },
      update: {
        $set: {
          avatar: {
            small: summary.avatar.small,
            medium: summary.avatar.medium,
            large: summary.avatar.large,
          },
          avatarLastSyncedAt: now,
        },
      },
    },
  }))

  // Mark players Steam returned no summary for (deleted / banned / private
  // accounts) as synced too, so they don't keep sorting first and starving the
  // rest of the player base on every cycle.
  const syncedIds = new Set(summaryArray.map(summary => steamId64.parse(summary.steamID)))
  const notReturned = steamIds.filter(steamId => !syncedIds.has(steamId))
  if (notReturned.length > 0) {
    operations.push({
      updateMany: {
        filter: { steamId: { $in: notReturned } },
        update: { $set: { avatarLastSyncedAt: now } },
      },
    })
  }

  // A single batched round-trip instead of one write per player.
  await collections.players.bulkWrite(operations)

  logger.debug(
    { requested: steamIds.length, updated: summaryArray.length, skipped: notReturned.length },
    'synced player avatars',
  )
}
