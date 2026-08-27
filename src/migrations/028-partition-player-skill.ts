import type { ObjectId } from 'mongodb'
import { collections } from '../database/collections'
import { logger } from '../logger'
import { defaultGamemode } from '../shared/default-gamemode'
import type { Gamemode } from '../shared/types/gamemode'
import { Tf2ClassName } from '../shared/types/tf2-class-name'

// Multi-gamemode partition, phase 4a: player skill becomes per-gamemode. Every
// existing player's flat class→skill map (and each skillHistory entry) is
// attributed to the gamemode this single-gamemode instance has been running.
//
// Idempotent: a flat class→skill map (pre-migration) has Tf2ClassName keys; a
// nested gamemode→(class→skill) map (post-migration) has Gamemode keys — so an
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
    const set: Record<string, unknown> = {}

    if (isFlatClassMap(player.skill)) {
      set['skill'] = { [g0]: player.skill }
    }

    if (player.skillHistory?.some(entry => entry.gamemode === undefined)) {
      set['skillHistory'] = player.skillHistory.map(entry => ({ gamemode: g0, ...entry }))
    }

    if (Object.keys(set).length === 0) continue

    await collections.players.updateOne({ _id: player._id }, { $set: set })
    migrated++
  }

  logger.info(`backfilled gamemode-scoped skill for ${migrated} players (gamemode ${g0})`)
}

interface LegacyPlayer {
  _id: ObjectId
  skill?: Record<string, number>
  skillHistory?: ({ gamemode?: Gamemode } & Record<string, unknown>)[]
}
