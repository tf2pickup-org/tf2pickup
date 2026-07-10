/**
 * One-off ops script: merge a secondary tf2pickup instance's database into a
 * primary one (e.g. fold `hl.tf2pickup.eu` 9v9 into `tf2pickup.eu`, now 6v6+9v9).
 *
 * Run AFTER both instances have applied the per-instance migrations, and ALWAYS
 * back up the primary first and rehearse with `--dry-run`:
 *
 *   MERGE_PRIMARY_URI=mongodb://.../primary \
 *   MERGE_SECONDARY_URI=mongodb://.../secondary \
 *   tsx src/merge-instances/run.ts --dry-run
 *
 * Assumptions (the documented v5 use case): the two instances ran disjoint
 * gamemodes. Games from both are re-sequenced by launch date into one global
 * numbering; each keeps a `legacy` mapping powering `/games/:n?old_gamemode=`.
 * Players are merged by steamId (primary wins, roles + per-gamemode data unioned).
 * Maps and per-gamemode configuration are folded in under the secondary's
 * gamemode. Game-number references in logs.tf logs are rewritten.
 *
 * This script intentionally does not touch transient game collections
 * (substitute requests, deferred kicks, round progress) — there should be no
 * in-flight games at merge time.
 */
import { MongoClient } from 'mongodb'
import type { GameModel } from '../database/models/game.model'
import type { PlayerModel } from '../database/models/player.model'
import type { MapPoolEntry } from '../database/models/map-pool-entry.model'
import { renumberGames, legacyKey } from './renumber-games'
import { mergePlayers } from './merge-players'

// Kept in sync with src/configuration/gamemode-scoped-keys.ts. Inlined so this
// standalone script does not pull in the app environment.
const gamemodeScopedKeys = [
  'games.default_player_skill',
  'games.whitelist_id',
  'queue.player_skill_threshold',
  'queue.map_cooldown',
  'games.auto_force_end_threshold',
  'games.join_queue_cooldown',
  'games.execute_extra_commands',
]

interface MergeOptions {
  primaryUri: string
  secondaryUri: string
  dryRun: boolean
}

function readOptions(): MergeOptions {
  const primaryUri = process.env['MERGE_PRIMARY_URI']
  const secondaryUri = process.env['MERGE_SECONDARY_URI']
  if (!primaryUri || !secondaryUri) {
    throw new Error('set MERGE_PRIMARY_URI and MERGE_SECONDARY_URI')
  }
  return {
    primaryUri,
    secondaryUri,
    dryRun: process.argv.includes('--dry-run') || process.env['MERGE_DRY_RUN'] === 'true',
  }
}

function gamemodesOf(games: Pick<GameModel, 'gamemode'>[]): Set<string> {
  return new Set(games.map(g => g.gamemode))
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
      primary.collection<GameModel>('games').find().toArray(),
      secondary.collection<GameModel>('games').find().toArray(),
    ])
    const secondaryGamemodes = gamemodesOf(secondaryGames)
    log(`games: ${primaryGames.length} primary + ${secondaryGames.length} secondary`)

    const primaryGamemode = [...gamemodesOf(primaryGames)][0]
    const { games, remap } = renumberGames([...primaryGames, ...secondaryGames])

    const [primaryPlayers, secondaryPlayers] = await Promise.all([
      primary.collection<PlayerModel>('players').find().toArray(),
      secondary.collection<PlayerModel>('players').find().toArray(),
    ])
    const mergedPlayers = mergePlayers(primaryPlayers, secondaryPlayers)
    log(
      `players: ${primaryPlayers.length} primary + ${secondaryPlayers.length} secondary → ${mergedPlayers.length} merged`,
    )

    const secondaryMaps = await secondary.collection<MapPoolEntry>('maps').find().toArray()
    log(`maps: importing ${secondaryMaps.length} from secondary`)

    const secondaryConfig = await secondary
      .collection<{ key: string; value: unknown }>('configuration')
      .find()
      .toArray()
    const secondaryGamemode = [...secondaryGamemodes][0]
    const configToImport = secondaryConfig.filter(
      entry => secondaryGamemode && gamemodeScopedKeys.includes(entry.key),
    )
    log(`config: importing ${configToImport.length} per-gamemode keys under #${secondaryGamemode}`)

    const [primaryLogs, secondaryLogs] = await Promise.all([
      primary.collection<{ logId: number; gameNumber: number }>('logstf.logs').find().toArray(),
      secondary.collection<{ logId: number; gameNumber: number }>('logstf.logs').find().toArray(),
    ])

    if (options.dryRun) {
      log('dry run complete — no writes performed')
      return
    }

    // Games: replace the primary set with the globally renumbered one.
    await primary.collection<GameModel>('games').deleteMany({})
    await primary.collection<GameModel>('games').insertMany(games)

    // Players: write the merged set.
    await primary.collection<PlayerModel>('players').deleteMany({})
    await primary.collection<PlayerModel>('players').insertMany(mergedPlayers)

    // Maps: union the secondary's per-gamemode pool in.
    if (secondaryMaps.length > 0) {
      await primary.collection<MapPoolEntry>('maps').insertMany(secondaryMaps)
    }

    // Config: move the secondary's per-gamemode values under the namespaced key.
    for (const entry of configToImport) {
      await primary
        .collection<{ key: string; value: unknown }>('configuration')
        .updateOne(
          { key: `${entry.key}#${secondaryGamemode}` },
          { $set: { value: entry.value } },
          { upsert: true },
        )
    }

    // logs.tf logs: rewrite the game numbers on both instances' logs via the remap.
    const rewriteLog = async (
      entry: { logId: number; gameNumber: number },
      gamemode: string | undefined,
    ) => {
      const newNumber = gamemode ? remap.get(legacyKey(gamemode, entry.gameNumber)) : undefined
      if (newNumber === undefined) return
      await primary
        .collection('logstf.logs')
        .updateOne({ logId: entry.logId }, { $set: { gameNumber: newNumber } }, { upsert: true })
    }
    for (const entry of primaryLogs) await rewriteLog(entry, primaryGamemode)
    for (const entry of secondaryLogs) await rewriteLog(entry, secondaryGamemode)

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
