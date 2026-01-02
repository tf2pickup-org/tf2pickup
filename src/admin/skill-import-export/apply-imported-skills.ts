import { collections } from '../../database/collections'
import type { PlayerSkill } from '../../database/models/player.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { players } from '../../players'
import type { ParsedSkillRow } from './parse-skill-import'
import type { SkillConflict } from './types'

export interface ApplyImportedSkillsResult {
  applied: number
  pending: number
  conflicts: SkillConflict[]
}

interface ApplyImportedSkillsParams {
  rows: ParsedSkillRow[]
  actor: SteamId64
}

export async function applyImportedSkills({
  rows,
  actor,
}: ApplyImportedSkillsParams): Promise<ApplyImportedSkillsResult> {
  const result: ApplyImportedSkillsResult = {
    applied: 0,
    pending: 0,
    conflicts: [],
  }

  for (const row of rows) {
    const player = await collections.players.findOne(
      { steamId: row.steamId },
      { projection: { name: 1, skill: 1 } },
    )

    if (!player) {
      // Player not registered, store as pending skill
      await collections.pendingSkills.updateOne(
        { steamId: row.steamId },
        {
          $set: {
            skill: row.skill,
            importedAt: new Date(),
            importedBy: actor,
          },
        },
        { upsert: true },
      )
      result.pending++
    } else if (!player.skill || Object.keys(player.skill).length === 0) {
      // Player exists but has no skill - apply directly
      await players.setSkill({
        steamId: row.steamId,
        skill: row.skill,
        actor,
      })
      result.applied++
    } else {
      // Player has existing skill - check if there's an actual difference
      // Compare only the classes that exist in the imported row
      const hasDifference = Object.entries(row.skill).some(([className, importedValue]) => {
        const currentValue = player.skill?.[className as keyof typeof player.skill]
        // If current is undefined but imported is defined, that's a difference
        if (currentValue === undefined) {
          return true
        }
        // Compare as strings to handle any type mismatches
        return String(currentValue) !== String(importedValue)
      })

      if (hasDifference) {
        result.conflicts.push({
          steamId: row.steamId,
          playerName: player.name,
          currentSkill: player.skill,
          importedSkill: row.skill,
        })
      } else {
        // Skills are identical, skip silently
        result.applied++
      }
    }
  }

  return result
}

interface ApplySkillOverrideParams {
  steamId: SteamId64
  skill: PlayerSkill
  actor: SteamId64
}

export async function applySkillOverride({ steamId, skill, actor }: ApplySkillOverrideParams) {
  await players.setSkill({ steamId, skill, actor })
}
