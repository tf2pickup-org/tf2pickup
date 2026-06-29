import type { ObjectId } from 'mongodb'
import { collections } from '../database/collections'
import { logger } from '../logger'
import { currentGamemode } from '../shared/current-gamemode'
import { Gamemode } from '../shared/types/gamemode'
import { Tf2ClassName } from '../shared/types/tf2-class-name'

// Phase 1 backfill: introduce the gamemode dimension on a single-gamemode
// instance. Every existing game and every player's skill/elo/stats is attributed
// to the gamemode this instance has been running (QUEUE_CONFIG → currentGamemode).
//
// Idempotent: already-nested documents are detected and skipped, so a re-run (or
// a run on a fresh database) is a no-op.

const tf2ClassNames = new Set<string>(Object.values(Tf2ClassName))

// A flat class→number map (pre-migration) has Tf2ClassName keys; a nested
// gamemode→(class→number) map (post-migration) has Gamemode keys.
function isFlatClassMap(value: Record<string, unknown> | undefined | null): boolean {
  if (!value) return false
  return Object.keys(value).some(key => tf2ClassNames.has(key))
}

export async function up() {
  const g0 = currentGamemode

  const gamesResult = await collections.games.updateMany(
    { gamemode: { $exists: false } },
    { $set: { gamemode: g0 } },
  )
  logger.info(`tagged ${gamesResult.modifiedCount} games with gamemode ${g0}`)

  const players = (await collections.players.find({}).toArray()) as unknown as LegacyPlayer[]
  let migrated = 0

  for (const player of players) {
    const set: Record<string, unknown> = {}

    if (isFlatClassMap(player.skill)) {
      set['skill'] = { [g0]: player.skill }
    }

    if (isFlatClassMap(player.elo)) {
      set['elo'] = { [g0]: player.elo }
    }

    if (player.eloHistory?.some(entry => entry.gamemode === undefined)) {
      set['eloHistory'] = player.eloHistory.map(entry => ({ gamemode: g0, ...entry }))
    }

    if (player.skillHistory?.some(entry => entry.gamemode === undefined)) {
      set['skillHistory'] = player.skillHistory.map(entry => ({ gamemode: g0, ...entry }))
    }

    const stats = player.stats
    if (stats && isFlatClassMap(stats.gamesByClass)) {
      set['stats.gamesByClass'] = { [g0]: stats.gamesByClass }
      set['stats.gamesByGamemode'] = { [g0]: stats.totalGames ?? 0 }
    } else if (stats && stats.gamesByGamemode === undefined) {
      set['stats.gamesByGamemode'] = {}
    }

    if (Object.keys(set).length === 0) continue

    await collections.players.updateOne({ _id: player._id }, { $set: set })
    migrated++
  }

  logger.info(`backfilled gamemode-scoped skill/elo/stats for ${migrated} players (gamemode ${g0})`)
}

interface LegacyPlayer {
  _id: ObjectId
  skill?: Record<string, number>
  elo?: Record<string, number>
  eloHistory?: ({ gamemode?: Gamemode } & Record<string, unknown>)[]
  skillHistory?: ({ gamemode?: Gamemode } & Record<string, unknown>)[]
  stats?: {
    totalGames?: number
    gamesByGamemode?: Record<string, number>
    gamesByClass?: Record<string, number>
  }
}
