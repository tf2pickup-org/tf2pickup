import { collections } from '../database/collections'
import type { PlayerModel } from '../database/models/player.model'
import { etf2l } from '../etf2l'
import { Etf2lApiError } from '../etf2l/errors/etf2l-api.error'
import { logger } from '../logger'
import { environment } from '../environment'

type PlayerProjection = Pick<PlayerModel, 'steamId' | 'etf2lProfileId'>

const requestIntervalMs = environment.NODE_ENV === 'test' ? 0 : 30_000
const progressDocumentId = 'players.etf2l-profile-sync'

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
  let lastRequestTimestamp: number | undefined

  await collections.etf2lSyncProgress.updateOne(
    { _id: progressDocumentId },
    {
      $set: {
        processed,
        updated,
        removed,
        skipped,
        startedAt: new Date(),
        lastUpdatedAt: new Date(),
      },
      $unset: { lastSteamId: '' },
    },
    { upsert: true },
  )

  const recordProgress = async (steamId: PlayerProjection['steamId']) => {
    await collections.etf2lSyncProgress.updateOne(
      { _id: progressDocumentId },
      {
        $set: {
          processed,
          updated,
          removed,
          skipped,
          lastSteamId: steamId,
          lastUpdatedAt: new Date(),
        },
      },
    )
  }

  for await (const player of cursor) {
    processed += 1
    await enforceRateLimit(lastRequestTimestamp)

    try {
      lastRequestTimestamp = Date.now()
      const profile = await etf2l.getPlayerProfile(player.steamId)
      if (player.etf2lProfileId === profile.id) {
        skipped += 1
        await recordProgress(player.steamId)
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
      await recordProgress(player.steamId)
    } catch (error: unknown) {
      if (error instanceof Etf2lApiError && error.response.status === 404) {
        if (typeof player.etf2lProfileId !== 'undefined') {
          await collections.players.updateOne(
            { steamId: player.steamId },
            { $unset: { etf2lProfileId: '' } },
          )
          removed += 1
          logger.debug({ steamId: player.steamId }, 'removed stale etf2l profile id')
          await recordProgress(player.steamId)
        } else {
          skipped += 1
          await recordProgress(player.steamId)
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

async function enforceRateLimit(lastRequestTimestamp: number | undefined) {
  if (typeof lastRequestTimestamp === 'undefined' || requestIntervalMs <= 0) {
    return
  }

  const elapsed = Date.now() - lastRequestTimestamp
  const waitTime = requestIntervalMs - elapsed
  if (waitTime > 0) {
    await delay(waitTime)
  }
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
