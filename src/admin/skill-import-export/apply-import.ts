import type { ImportAnalysis } from './types'
import { collections } from '../../database/collections'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { setSkill } from '../../players/set-skill'

interface ApplyImportParams {
  analysis: ImportAnalysis
  actor: SteamId64
}

export async function applyImport({ analysis, actor }: ApplyImportParams): Promise<void> {
  const playersToUpdate = [
    ...analysis.changedPlayers.map(p => ({ steamId: p.steamId, skill: p.newSkill })),
    ...analysis.initializedPlayers.map(p => ({ steamId: p.steamId, skill: p.newSkill })),
  ]

  for (const player of playersToUpdate) {
    await setSkill({ steamId: player.steamId, skill: player.skill, actor })
  }

  if (analysis.futurePlayers.length > 0) {
    const now = new Date()
    const bulkOps = analysis.futurePlayers.map(player => ({
      updateOne: {
        filter: { steamId: player.steamId },
        update: {
          $set: {
            skill: player.skill,
            actor,
            createdAt: now,
          },
        },
        upsert: true,
      },
    }))

    await collections.futurePlayerSkills.bulkWrite(bulkOps)
  }
}
