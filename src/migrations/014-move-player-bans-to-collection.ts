import { collections } from '../database/collections'
import { logger } from '../logger'
import type { PlayerBan } from '../database/models/player.model'
import type { SteamId64 } from '../shared/types/steam-id-64'

interface PlayerWithBans {
  steamId: SteamId64
  bans?: PlayerBan[]
}

export async function up() {
  logger.info('Starting migration: move player bans to collection')
  
  // Find all players with bans - using raw query to access the bans field that may still exist in the database
  // Cast to any to bypass TypeScript checking since the bans field exists in the database but not in the type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playersWithBans = (await (collections.players as any)
    .find({ bans: { $exists: true, $ne: [] } })
    .toArray()) as PlayerWithBans[]

  logger.info(`Found ${playersWithBans.length} players with bans to migrate`)

  for (const player of playersWithBans) {
    const bans = player.bans
    if (!bans || bans.length === 0) {
      continue
    }

    // Upsert the player bans document
    await collections.playerBans.updateOne(
      { steamId: player.steamId },
      {
        $set: {
          steamId: player.steamId,
          bans: bans,
        },
      },
      { upsert: true },
    )

    logger.debug(`Migrated bans for player ${player.steamId}`)
  }

  logger.info(`Migration complete: migrated bans for ${playersWithBans.length} players`)
  
  // Note: We don't unset the old bans field here to allow for a transitional period
  // The old field will be removed in a later step once all code paths are updated
}
