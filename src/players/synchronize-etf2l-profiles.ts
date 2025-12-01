import { collections } from '../database/collections'
import type { PlayerModel } from '../database/models/player.model'
import { etf2l } from '../etf2l'
import { Etf2lApiError } from '../etf2l/errors/etf2l-api.error'
import { logger } from '../logger'

type PlayerProjection = Pick<PlayerModel, 'steamId' | 'etf2lProfileId'>

export async function synchronizeEtf2lProfiles(): Promise<void> {
  logger.info('synchronizing ETF2L.org data for all players')

  const cursor = collections.players.find<PlayerProjection>(
    {},
    {
      projection: {
        steamId: 1,
        etf2lProfileId: 1,
        _id: 0,
      },
    },
  )

  let processed = 0
  let updated = 0
  let removed = 0
  let skipped = 0

  for await (const player of cursor) {
    processed += 1

    try {
      const profile = await etf2l.getPlayerProfile(player.steamId)
      if (player.etf2lProfileId === profile.id) {
        skipped += 1
        continue
      }

      await collections.players.updateOne(
        { steamId: player.steamId },
        { $set: { etf2lProfileId: profile.id } },
      )
      updated += 1
      logger.debug(
        { steamId: player.steamId, previous: player.etf2lProfileId, next: profile.id },
        'updated etf2l profile id',
      )
    } catch (error: unknown) {
      if (error instanceof Etf2lApiError && error.response.status === 404) {
        if (typeof player.etf2lProfileId !== 'undefined') {
          await collections.players.updateOne(
            { steamId: player.steamId },
            { $unset: { etf2lProfileId: '' } },
          )
          removed += 1
          logger.debug({ steamId: player.steamId }, 'removed stale etf2l profile id')
        } else {
          skipped += 1
        }
        continue
      }

      throw error
    }
  }

  logger.info(
    { processed, updated, removed, skipped },
    'finished synchronizing ETF2L.org player data',
  )
}
