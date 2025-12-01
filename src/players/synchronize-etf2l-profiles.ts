import { delay } from 'es-toolkit'
import { secondsToMilliseconds } from 'date-fns'
import { ObjectId, MongoServerError } from 'mongodb'
import { collections } from '../database/collections'
import type { PlayerModel } from '../database/models/player.model'
import {
  ETF2L_SYNC_PROGRESS_ID,
  type Etf2lSyncProgressDocument,
} from '../database/models/etf2l-sync-progress.model'
import { etf2l } from '../etf2l'
import { Etf2lApiError } from '../etf2l/errors/etf2l-api.error'
import { logger } from '../logger'
import { environment } from '../environment'
import { errors } from '../errors'

type PlayerProjection = Pick<PlayerModel, 'steamId' | 'etf2lProfileId'> & { _id: ObjectId }

const requestIntervalMs = environment.NODE_ENV === 'test' ? 0 : secondsToMilliseconds(30)
const heartbeatTimeoutMs = secondsToMilliseconds(120)

export async function synchronizeEtf2lProfiles(): Promise<void> {
  logger.info('synchronizing ETF2L.org data for all players')

  const progress = await claimProgressDocument()

  let processed = progress.processed
  let updated = progress.updated
  let removed = progress.removed
  let skipped = progress.skipped
  let lastPlayerObjectId = progress.lastPlayerObjectId
  let lastRequestTimestamp: number | undefined

  const cursor = collections.players
    .find<PlayerProjection>(lastPlayerObjectId ? { _id: { $gt: lastPlayerObjectId } } : {}, {
      projection: {
        steamId: 1,
        etf2lProfileId: 1,
      },
    })
    .sort({ _id: 1 })

  const recordProgress = async (player: PlayerProjection) => {
    lastPlayerObjectId = player._id
    const result = await collections.etf2lSyncProgress.updateOne(
      { _id: ETF2L_SYNC_PROGRESS_ID },
      {
        $set: {
          processed,
          updated,
          removed,
          skipped,
          lastSteamId: player.steamId,
          lastPlayerObjectId,
          lastUpdatedAt: new Date(),
        },
      },
    )

    if (result.matchedCount === 0) {
      throw errors.conflict('ETF2L profile synchronization ownership lost')
    }
  }

  for await (const player of cursor) {
    processed += 1
    await enforceRateLimit(lastRequestTimestamp)

    try {
      lastRequestTimestamp = Date.now()
      const profile = await etf2l.getPlayerProfile(player.steamId)
      if (player.etf2lProfileId === profile.id) {
        skipped += 1
        await recordProgress(player)
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
      await recordProgress(player)
    } catch (error: unknown) {
      if (error instanceof Etf2lApiError && error.response.status === 404) {
        if (typeof player.etf2lProfileId !== 'undefined') {
          await collections.players.updateOne(
            { steamId: player.steamId },
            { $unset: { etf2lProfileId: '' } },
          )
          removed += 1
          logger.debug({ steamId: player.steamId }, 'removed stale etf2l profile id')
          await recordProgress(player)
        } else {
          skipped += 1
          await recordProgress(player)
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

  await collections.etf2lSyncProgress.deleteOne({ _id: ETF2L_SYNC_PROGRESS_ID })
}

async function claimProgressDocument(): Promise<Etf2lSyncProgressDocument> {
  const now = new Date()
  const existing = await collections.etf2lSyncProgress.findOne({
    _id: ETF2L_SYNC_PROGRESS_ID,
  })

  if (!existing) {
    const initialDocument: Etf2lSyncProgressDocument = {
      _id: ETF2L_SYNC_PROGRESS_ID,
      processed: 0,
      updated: 0,
      removed: 0,
      skipped: 0,
      startedAt: now,
      lastUpdatedAt: now,
    }

    try {
      await collections.etf2lSyncProgress.insertOne(initialDocument)
      return initialDocument
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw errors.conflict('ETF2L profile synchronization already running')
      }
      throw error
    }
  }

  if (isHeartbeatFresh(existing, now)) {
    throw errors.conflict('ETF2L profile synchronization already running')
  }

  const { value } = await collections.etf2lSyncProgress.findOneAndUpdate<Etf2lSyncProgressDocument>(
    { _id: ETF2L_SYNC_PROGRESS_ID, lastUpdatedAt: existing.lastUpdatedAt },
    { $set: { lastUpdatedAt: now } },
    { returnDocument: 'after' },
  )

  if (!value) {
    throw errors.conflict('ETF2L profile synchronization already running')
  }

  logger.info(
    { processed: value.processed, lastSteamId: value.lastSteamId },
    'resuming ETF2L.org synchronization from previous run',
  )

  return value
}

function isHeartbeatFresh(progress: Etf2lSyncProgressDocument, now: Date): boolean {
  return now.getTime() - progress.lastUpdatedAt.getTime() <= heartbeatTimeoutMs
}

function isDuplicateKeyError(error: unknown): error is MongoServerError {
  return error instanceof MongoServerError && error.code === 11000
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
