import { collections } from '../database/collections'
import { logger } from '../logger'
import type { PlayerModel } from '../database/models/player.model'

interface OldPlayerModel extends Omit<PlayerModel, 'etf2lProfile'> {
  etf2lProfileId?: number
}

export async function up() {
  const players = await collections.players
    .find<OldPlayerModel>({
      etf2lProfileId: { $exists: true },
    })
    .toArray()

  logger.info(`Found ${players.length} players with ETF2L profile data to migrate`)

  for (const player of players) {
    // Create etf2lProfile subdocument
    // Set lastSyncedAt to old date to ensure all profiles get re-synced
    // Name and country will be populated by the sync mechanism
    await collections.players.updateOne(
      { steamId: player.steamId },
      {
        $set: {
          etf2lProfile: {
            id: player.etf2lProfileId!,
            name: '',
            country: '',
          },
          etf2lProfileLastSyncedAt: new Date(0),
        },
        $unset: {
          etf2lProfileId: 1,
        },
      },
    )
  }

  logger.info('Completed ETF2L profile migration')
}
