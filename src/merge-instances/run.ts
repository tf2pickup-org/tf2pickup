/**
 * One-off ops script: merge a secondary tf2pickup instance's database into a
 * primary one (e.g. fold `hl.tf2pickup.eu` 9v9 into `tf2pickup.eu`, now 6v6+9v9).
 *
 * Run AFTER both instances have applied the 5.0.0 migrations, during full
 * downtime with no games in progress, and ALWAYS back up the primary first and
 * rehearse with `--dry-run`:
 *
 *   MERGE_PRIMARY_URI=mongodb://.../primary \
 *   MERGE_SECONDARY_URI=mongodb://.../secondary \
 *   MERGE_SOURCE_HOST=hl.tf2pickup.eu \
 *   tsx src/merge-instances/run.ts --dry-run
 *
 * Only the incoming (secondary) games are renumbered — they continue the
 * primary's global sequence — and a `(sourceHost, oldNumber) → newNumber` remap
 * is persisted so legacy links resolve (ADR 0001). Every incoming reference to a
 * game number is rewritten before insert. Players merge by steamId (primary
 * wins identity + roles, earliest registration, unioned bans + per-gamemode
 * data). Maps and per-gamemode configuration fold in under the secondary's
 * gamemode.
 *
 * Standalone: it talks to Mongo directly and imports only pure helpers + model
 * types, so it never pulls in the app environment.
 */
import { MongoClient, type Document } from 'mongodb'
import type { GameModel } from '../database/models/game.model'
import type { PlayerModel } from '../database/models/player.model'
import type { GameNumberRemapModel } from '../database/models/game-number-remap.model'
import { renumberIncomingGames } from './renumber-incoming-games'
import { mergePlayers } from './merge-players'

// Kept in sync with src/configuration/gamemode-scoped-keys.ts. Inlined so this
// standalone script does not import the app configuration (and its environment).
const gamemodeScopedKeys = new Set([
  'games.whitelist_id',
  'queue.player_skill_threshold',
  'games.default_player_skill',
])

// Foreign-key collections that reference a game by its number and must be
// rewritten for the renumbered incoming games (ADR 0001). `gamelogs` is keyed
// by logSecret, not number, so it is not here.
const gameNumberCollections = [
  'games.roundprogress',
  'games.substituterequests',
  'games.deferredkicks',
  'logstf.logs',
]

interface MergeOptions {
  primaryUri: string
  secondaryUri: string
  sourceHost: string
  dryRun: boolean
}

function readOptions(): MergeOptions {
  const primaryUri = process.env['MERGE_PRIMARY_URI']
  const secondaryUri = process.env['MERGE_SECONDARY_URI']
  const sourceHost = process.env['MERGE_SOURCE_HOST']
  if (!primaryUri || !secondaryUri || !sourceHost) {
    throw new Error('set MERGE_PRIMARY_URI, MERGE_SECONDARY_URI and MERGE_SOURCE_HOST')
  }
  return {
    primaryUri,
    secondaryUri,
    sourceHost,
    dryRun: process.argv.includes('--dry-run') || process.env['MERGE_DRY_RUN'] === 'true',
  }
}

export async function mergeInstances(options: MergeOptions): Promise<void> {
  const log = (msg: string) => {
    console.info(`[merge]${options.dryRun ? ' (dry-run)' : ''} ${msg}`)
  }

  const primaryClient = new MongoClient(options.primaryUri)
  const secondaryClient = new MongoClient(options.secondaryUri)
  await Promise.all([primaryClient.connect(), secondaryClient.connect()])

  try {
    const primary = primaryClient.db()
    const secondary = secondaryClient.db()

    const [primaryGames, secondaryGames] = await Promise.all([
      primary
        .collection<GameModel>('games')
        .find({}, { projection: { number: 1 } })
        .toArray(),
      secondary.collection<GameModel>('games').find().toArray(),
    ])
    log(`games: ${primaryGames.length} primary + ${secondaryGames.length} incoming`)

    const { games, remap, numberMap } = renumberIncomingGames(
      primaryGames.map(g => g.number),
      secondaryGames,
      options.sourceHost,
    )

    // Read the incoming foreign-key documents and remap their game numbers.
    const rewrittenFk = new Map<string, Document[]>()
    for (const name of gameNumberCollections) {
      const docs = await secondary.collection(name).find().toArray()
      const rewritten = docs.flatMap(doc => {
        const newNumber = numberMap.get(doc['gameNumber'] as number)
        return newNumber === undefined ? [] : [{ ...doc, gameNumber: newNumber }]
      })
      rewrittenFk.set(name, rewritten)
      log(`${name}: ${rewritten.length}/${docs.length} incoming refs rewritten`)
    }

    const [primaryPlayers, secondaryPlayers] = await Promise.all([
      primary.collection<PlayerModel>('players').find().toArray(),
      secondary.collection<PlayerModel>('players').find().toArray(),
    ])
    const mergedPlayers = mergePlayers(primaryPlayers, secondaryPlayers)
    log(
      `players: ${primaryPlayers.length} primary + ${secondaryPlayers.length} incoming → ${mergedPlayers.length} merged`,
    )

    const secondaryMaps = await secondary.collection('maps').find().toArray()
    const secondaryConfig = await secondary
      .collection<{ key: string; value: unknown }>('configuration')
      .find()
      .toArray()
    const secondaryGamemode = secondaryGames[0]?.gamemode
    const configToImport = secondaryConfig.filter(entry => gamemodeScopedKeys.has(entry.key))
    log(`maps: ${secondaryMaps.length} incoming`)
    log(`config: ${configToImport.length} per-gamemode keys under #${secondaryGamemode ?? '?'}`)

    if (options.dryRun) {
      log('dry run complete — no writes performed')
      return
    }

    // Games + their remapped foreign keys.
    if (games.length > 0) {
      await primary.collection<GameModel>('games').insertMany(games)
    }
    for (const name of gameNumberCollections) {
      const docs = rewrittenFk.get(name) ?? []
      if (docs.length > 0) {
        await primary.collection(name).insertMany(docs)
      }
    }
    if (remap.length > 0) {
      await primary.collection<GameNumberRemapModel>('games.numberremap').insertMany(remap)
    }

    // Players: replace the primary set with the merged one.
    await primary.collection<PlayerModel>('players').deleteMany({})
    await primary.collection<PlayerModel>('players').insertMany(mergedPlayers)

    // Maps: fold the incoming (gamemode-tagged) pool in.
    if (secondaryMaps.length > 0) {
      await primary.collection('maps').insertMany(secondaryMaps)
    }

    // Config: import the incoming per-gamemode values under the namespaced key.
    if (secondaryGamemode) {
      for (const entry of configToImport) {
        await primary
          .collection<{ key: string; value: unknown }>('configuration')
          .updateOne(
            { key: `${entry.key}#${secondaryGamemode}` },
            { $set: { value: entry.value } },
            { upsert: true },
          )
      }
    }

    log('merge complete')
  } finally {
    await Promise.all([primaryClient.close(), secondaryClient.close()])
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  mergeInstances(readOptions()).catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
}
