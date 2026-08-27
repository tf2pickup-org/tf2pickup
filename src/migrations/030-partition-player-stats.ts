import type { ObjectId } from 'mongodb'
import { collections } from '../database/collections'
import { logger } from '../logger'
import { defaultGamemode } from '../shared/default-gamemode'
import { Tf2ClassName } from '../shared/types/tf2-class-name'

// Multi-gamemode partition, phase 4c: player stats become per-gamemode. Every
// existing player's flat class→count map is nested under the gamemode this
// single-gamemode instance has been running, and gamesByGamemode is seeded from
// totalGames.
//
// Idempotent: a flat class→count map (pre-migration) has Tf2ClassName keys; a
// nested gamemode→(class→count) map (post-migration) has Gamemode keys — so an
// already-migrated document is detected and skipped.
const tf2ClassNames = new Set<string>(Object.values(Tf2ClassName))

function isFlatClassMap(value: Record<string, unknown> | undefined | null): boolean {
  if (!value) return false
  return Object.keys(value).some(key => tf2ClassNames.has(key))
}

export async function up() {
  const g0 = defaultGamemode
  const players = (await collections.players.find({}).toArray()) as unknown as LegacyPlayer[]
  let migrated = 0

  for (const player of players) {
    const stats = player.stats
    if (!stats) continue

    const set: Record<string, unknown> = {}

    if (isFlatClassMap(stats.gamesByClass)) {
      set['stats.gamesByClass'] = { [g0]: stats.gamesByClass }
      set['stats.gamesByGamemode'] = { [g0]: stats.totalGames ?? 0 }
    } else if (stats.gamesByGamemode === undefined) {
      set['stats.gamesByGamemode'] = {}
    }

    if (Object.keys(set).length === 0) continue

    await collections.players.updateOne({ _id: player._id }, { $set: set })
    migrated++
  }

  logger.info(`backfilled gamemode-scoped stats for ${migrated} players (gamemode ${g0})`)
}

interface LegacyPlayer {
  _id: ObjectId
  stats?: {
    totalGames?: number
    gamesByGamemode?: Record<string, number>
    gamesByClass?: Record<string, unknown>
  }
}
