/**
 * Merges another tf2pickup instance (the incoming one) into this one (the primary), e.g. a 9v9
 * instance into a 6v6 one. Its queues, games, players and history move over; the incoming
 * instance's games get new numbers, and its old game links keep working (ADR 0001).
 *
 * Run it during downtime, with both instances stopped and on the same version, after backing up
 * the primary. Rehearse with --dry-run first:
 *
 *   MERGE_PRIMARY_URI=mongodb://…/tf2pickup \
 *   MERGE_INCOMING_URI=mongodb://…/tf2pickup-hl \
 *   MERGE_SOURCE_HOST=hl.tf2pickup.eu \
 *   node dist/src/merge-instances/run.js --dry-run
 *
 * It talks to both databases directly and never loads the app's environment.
 */
import { omit } from 'es-toolkit'
import { MongoClient, type Db, type Document, type WithId } from 'mongodb'
import { GameState, type GameModel } from '../database/models/game.model'
import type { GameNumberRemapModel } from '../database/models/game-number-remap.model'
import type { PlayerModel } from '../database/models/player.model'
import type { QueueModel } from '../database/models/queue.model'
import type { StatsModel } from '../database/models/stats.model'
import type { Gamemode } from '../shared/types/gamemode'
import { mergeGamemodeConfiguration } from './merge-gamemode-configuration'
import { mergePlayers } from './merge-players'
import { planQueues } from './plan-queues'
import { renumberIncomingGames } from './renumber-incoming-games'

// Collections referencing a game by its number.
const gameNumberCollections = [
  'games.roundprogress',
  'games.substituterequests',
  'games.deferredkicks',
  'logstf.logs',
  'activitylog',
]
// Collections copied over as they are.
const copiedCollections = ['gamelogs', 'playeractions', 'chat.messages']
const mergedConfigurationKeys = [
  'games.default_player_skill',
  'games.gamemode_whitelist_ids',
  'games.whitelist_id',
] as const

interface MergeOptions {
  primaryUri: string
  incomingUri: string
  sourceHost: string
  dryRun: boolean
}

export async function mergeInstances(options: MergeOptions) {
  const log = (message: string) => {
    console.info(`[merge]${options.dryRun ? ' (dry run)' : ''} ${message}`)
  }

  const primaryClient = new MongoClient(options.primaryUri)
  const incomingClient = new MongoClient(options.incomingUri)
  await Promise.all([primaryClient.connect(), incomingClient.connect()])
  try {
    const primary = primaryClient.db()
    const incoming = incomingClient.db()
    await assertCanMerge(primary, incoming, options.sourceHost)

    const [primaryQueues, incomingQueues, primaryGameNumbers, incomingGames] = await Promise.all([
      primary.collection<QueueModel>('queues').find().toArray(),
      incoming.collection<QueueModel>('queues').find().toArray(),
      primary
        .collection<GameModel>('games')
        .find({}, { projection: { number: 1 } })
        .toArray()
        .then(games => games.map(game => game.number)),
      incoming.collection<GameModel>('games').find().toArray(),
    ])

    const queuePlan = planQueues(
      primaryQueues,
      incomingQueues,
      new Set(incomingGames.flatMap(game => (game.queue ? [game.queue.toHexString()] : []))),
    )
    for (const queue of queuePlan.updates) {
      log(`queue ${queue.slug}: takes the incoming settings and maps, and gets enabled`)
    }
    for (const queue of queuePlan.inserts) {
      log(`queue ${queue.slug}: added`)
    }

    const { games, remap, numberMap } = renumberIncomingGames(
      primaryGameNumbers,
      incomingGames,
      options.sourceHost,
    )
    const renumberedGames = games.map(({ queue, ...game }) => {
      const target = queue && queuePlan.idMap.get(queue.toHexString())
      return target ? { ...game, queue: target } : game
    })
    log(
      `games: ${primaryGameNumbers.length} + ${games.length}, the incoming ones renumbered from ${games[0]?.number ?? '-'}`,
    )

    const renumbered = new Map<string, Document[]>()
    for (const name of gameNumberCollections) {
      const docs = await incoming.collection(name).find().toArray()
      renumbered.set(
        name,
        docs
          .map(doc => omit(doc, ['_id']))
          .map(doc =>
            typeof doc['gameNumber'] === 'number'
              ? { ...doc, gameNumber: numberMap.get(doc['gameNumber']) ?? doc['gameNumber'] }
              : doc,
          ),
      )
      log(`${name}: ${docs.length} incoming`)
    }

    const [primaryPlayers, incomingPlayers] = await Promise.all([
      primary.collection<PlayerModel>('players').find().toArray(),
      incoming.collection<PlayerModel>('players').find().toArray(),
    ])
    const players = mergePlayers(primaryPlayers, incomingPlayers, numberMap)
    const known = new Set(primaryPlayers.map(player => player.steamId))
    log(
      `players: ${players.filter(p => known.has(p.steamId)).length} merged, ${players.filter(p => !known.has(p.steamId)).length} added`,
    )

    const incomingGamemodes = [
      ...new Set([...queuePlan.updates, ...queuePlan.inserts].map(queue => queue.gamemode)),
    ] as Gamemode[]
    const configuration = mergeGamemodeConfiguration(
      await readConfiguration(primary),
      await readConfiguration(incoming),
      incomingGamemodes,
    )
    log(`configuration: ${Object.keys(configuration).join(', ') || 'unchanged'}`)

    if (options.dryRun) {
      log('no changes made')
      return
    }

    for (const { _id, ...queue } of queuePlan.updates) {
      await primary
        .collection<QueueModel>('queues')
        .updateOne({ _id }, { $set: { ...queue, enabled: true } })
    }
    if (queuePlan.inserts.length > 0) {
      await primary.collection<QueueModel>('queues').insertMany(queuePlan.inserts)
    }

    if (renumberedGames.length > 0) {
      await primary.collection('games').insertMany(renumberedGames)
      await primary.collection<GameNumberRemapModel>('games.numberremap').insertMany(remap)
    }
    for (const [name, docs] of renumbered) {
      if (docs.length > 0) {
        await primary.collection(name).insertMany(docs)
      }
    }
    for (const name of copiedCollections) {
      const docs = await incoming.collection(name).find().toArray()
      if (docs.length > 0) {
        await primary.collection(name).insertMany(docs.map(doc => omit(doc, ['_id'])))
      }
    }

    // the players came from the database, _id included
    for (const player of players.map(p => omit(p as WithId<PlayerModel>, ['_id']))) {
      await primary
        .collection<PlayerModel>('players')
        .replaceOne({ steamId: player.steamId }, player, { upsert: true })
    }
    const futureSkills = await incoming.collection('futureplayerskills').find().toArray()
    for (const skill of futureSkills.map(doc => omit(doc, ['_id']))) {
      await primary
        .collection('futureplayerskills')
        .updateOne(
          { steamId: skill['steamId'], gamemode: skill['gamemode'] },
          { $setOnInsert: skill },
          { upsert: true },
        )
    }

    for (const [key, value] of Object.entries(configuration)) {
      await primary
        .collection<{ key: string; value: unknown }>('configuration')
        .updateOne({ key }, { $set: { value } }, { upsert: true })
    }

    const incomingStats = await incoming.collection<StatsModel>('stats').findOne({ _id: 'total' })
    if (incomingStats) {
      await primary
        .collection<StatsModel>('stats')
        .updateOne(
          { _id: 'total' },
          { $inc: { totalDurationMs: incomingStats.totalDurationMs } },
          { upsert: true },
        )
    }

    log('done')
  } finally {
    await Promise.all([primaryClient.close(), incomingClient.close()])
  }
}

async function assertCanMerge(primary: Db, incoming: Db, sourceHost: string) {
  const [primaryMigrations, incomingMigrations] = await Promise.all(
    [primary, incoming].map(async db =>
      (await db.collection<{ name: string }>('migrations2').find().toArray())
        .map(({ name }) => name)
        .sort()
        .join(),
    ),
  )
  if (primaryMigrations !== incomingMigrations) {
    throw new Error('both instances must run the same version')
  }

  for (const db of [primary, incoming]) {
    const live = await db
      .collection<GameModel>('games')
      .countDocuments({ state: { $nin: [GameState.ended, GameState.interrupted] } })
    if (live > 0) {
      throw new Error(`${db.databaseName} has ${live} games in progress`)
    }
  }

  if (await primary.collection('games.numberremap').findOne({ sourceHost })) {
    throw new Error(`${sourceHost} has already been merged`)
  }
}

async function readConfiguration(db: Db) {
  const entries = await db
    .collection<{ key: string; value: unknown }>('configuration')
    .find({ key: { $in: [...mergedConfigurationKeys] } })
    .toArray()
  return Object.fromEntries(entries.map(({ key, value }) => [key, value])) as Parameters<
    typeof mergeGamemodeConfiguration
  >[0]
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const primaryUri = process.env['MERGE_PRIMARY_URI']
  const incomingUri = process.env['MERGE_INCOMING_URI']
  const sourceHost = process.env['MERGE_SOURCE_HOST']
  if (!primaryUri || !incomingUri || !sourceHost) {
    console.error('set MERGE_PRIMARY_URI, MERGE_INCOMING_URI and MERGE_SOURCE_HOST')
    process.exit(1)
  }

  mergeInstances({
    primaryUri,
    incomingUri,
    sourceHost,
    dryRun: process.argv.includes('--dry-run'),
  }).catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
}
