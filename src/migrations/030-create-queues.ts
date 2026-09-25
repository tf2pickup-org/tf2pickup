import { MongoServerError, ObjectId } from 'mongodb'
import { collections } from '../database/collections'
import { database } from '../database/database'
import type { MapPoolEntry } from '../database/models/map-pool-entry.model'
import { GameState } from '../database/models/game.model'
import { createQueueSchema, type QueueId, type QueueModel } from '../database/models/queue.model'
import { environment } from '../environment'
import { logger } from '../logger'
import { queuePresets } from '../queues/presets'

// Settings that used to be instance-wide and now belong to a queue.
const movedSettings = {
  'queue.player_skill_threshold': 'skillThreshold',
  'queue.require_player_verification': 'requireVerification',
  'queue.ready_up_timeout': 'readyUpTimeout',
  'queue.ready_state_timeout': 'readyStateTimeout',
  'queue.map_cooldown': 'mapCooldown',
} as const

// An instance used to run exactly one auto queue, for the gamemode picked by QUEUE_CONFIG. It
// becomes that gamemode's auto queue, the only enabled one; the other presets are added disabled.
export async function up() {
  const configuration = database.collection<{ key: string; value: unknown }>('configuration')
  const legacyMaps = database.collection<MapPoolEntry>('maps')
  const legacySlug = `auto-${environment.QUEUE_CONFIG}`

  const settings = Object.fromEntries(
    await Promise.all(
      Object.entries(movedSettings).map(async ([key, field]) => {
        const entry = await configuration.findOne({ key })
        return [field, entry?.value] as const
      }),
    ),
  )
  const maps = await legacyMaps.find({}, { projection: { _id: 0 } }).toArray()

  const queues: QueueModel[] = queuePresets.map(({ maps: presetMaps, ...preset }, position) => {
    const isLegacy = preset.slug === legacySlug
    return {
      ...createQueueSchema.parse(
        isLegacy
          ? {
              ...preset,
              ...Object.fromEntries(Object.entries(settings).filter(([, v]) => v !== undefined)),
            }
          : preset,
      ),
      _id: new ObjectId() as QueueId,
      position,
      enabled: isLegacy,
      maps: isLegacy && maps.length > 0 ? maps : presetMaps,
    }
  })
  await collections.queues.insertMany(queues)

  const legacyQueue = queues.find(({ slug }) => slug === legacySlug)!
  for (const collection of [
    collections.queueSlots,
    collections.queueState,
    collections.queueMapOptions,
    collections.queueMapVotes,
    collections.queueFriends,
  ] as const) {
    await collection.updateMany({ queue: { $exists: false } }, { $set: { queue: legacyQueue._id } })
  }

  for (const [collection, index] of [
    [collections.queueSlots, 'id_1'],
    [collections.queueMapOptions, 'name_1'],
    [collections.queueFriends, 'source_1'],
  ] as const) {
    await ignoreMissing(() => collection.dropIndex(index))
  }

  await collections.games.updateMany(
    { queue: { $exists: false } },
    { $set: { queue: legacyQueue._id } },
  )
  const whitelistId = (await configuration.findOne({ key: 'games.whitelist_id' }))?.value
  for (const game of await collections.games
    .find({ state: { $nin: [GameState.ended, GameState.interrupted] } })
    .toArray()) {
    const snapshot: { execConfig?: string; whitelistId?: string } = {}
    const execConfig = maps.find(({ name }) => name === game.map)?.execConfig
    if (execConfig) {
      snapshot.execConfig = execConfig
    }
    if (typeof whitelistId === 'string' && whitelistId) {
      snapshot.whitelistId = whitelistId
    }
    if (Object.keys(snapshot).length > 0) {
      await collections.games.updateOne({ _id: game._id }, { $set: snapshot })
    }
  }

  await collections.tasks.updateMany(
    { name: { $in: ['queue:readyUpTimeout', 'queue:unready'] } },
    { $set: { 'args.queue': legacyQueue._id } },
  )

  await configuration.deleteMany({ key: { $in: Object.keys(movedSettings) } })
  await ignoreMissing(() => legacyMaps.drop())

  logger.info(`created ${queues.length} queues, enabled ${legacySlug}`)
}

async function ignoreMissing(operation: () => Promise<unknown>) {
  try {
    await operation()
  } catch (error) {
    if (!(
      error instanceof MongoServerError &&
      ['IndexNotFound', 'NamespaceNotFound'].includes(error.codeName ?? '')
    )) {
      throw error
    }
  }
}
