import SteamAPI from 'steamapi'
import { collections } from '../database/collections'
import { environment } from '../environment'
import { logger } from '../logger'
import { steamId64 } from '../shared/schemas/steam-id-64'

const steamApi = new SteamAPI(environment.STEAM_API_KEY)

export async function up() {
  const players = await collections.players
    .find(
      {
        $or: [
          { avatar: { $exists: false } },
          { 'avatar.small': { $exists: false } },
          { 'avatar.medium': { $exists: false } },
          { 'avatar.large': { $exists: false } },
        ],
      },
      { projection: { steamId: 1 } },
    )
    .toArray()

  logger.info(`found ${players.length} players with missing avatar fields`)

  const batchSize = 100
  let updated = 0

  for (let i = 0; i < players.length; i += batchSize) {
    const batch = players.slice(i, i + batchSize)
    const steamIds = batch.map(p => p.steamId)

    let summaries: Awaited<ReturnType<typeof steamApi.getUserSummary>>
    try {
      summaries = await steamApi.getUserSummary(steamIds)
    } catch (error) {
      logger.warn({ steamIds, error }, 'failed to fetch Steam summaries for batch, skipping')
      continue
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
          },
        },
      )
      updated++
    }
  }

  logger.info(`fixed avatars for ${updated} players`)
}
