import type { ParsedPlayerSkill } from './parse-csv'
import type { ChangedPlayer, FuturePlayer, ImportAnalysis, InitializedPlayer } from './types'
export type { ImportAnalysis } from './types'
import { collections } from '../../database/collections'
import type { PlayerModel, PlayerSkill } from '../../database/models/player.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { Tf2ClassName } from '../../shared/types/tf2-class-name'

function skillsEqual(a: PlayerSkill | undefined, b: PlayerSkill): boolean {
  return Object.values(Tf2ClassName).every(k => a?.[k] === b[k])
}

function makeProfileUrl(steamId: SteamId64): string {
  return `/player/${steamId}`
}

export async function analyzeImport(parsedPlayers: ParsedPlayerSkill[]): Promise<ImportAnalysis> {
  const steamIds = parsedPlayers.map(p => p.steamId)
  const existingPlayers = await collections.players
    .find({ steamId: { $in: steamIds } }, { projection: { steamId: 1, name: 1, skill: 1 } })
    .toArray()

  const existingPlayerMap = new Map<SteamId64, Pick<PlayerModel, 'steamId' | 'name' | 'skill'>>()
  for (const player of existingPlayers) {
    existingPlayerMap.set(player.steamId, player)
  }

  const changedPlayers: ChangedPlayer[] = []
  const initializedPlayers: InitializedPlayer[] = []
  const futurePlayers: FuturePlayer[] = []
  let unaffectedCount = 0

  for (const parsed of parsedPlayers) {
    const existing = existingPlayerMap.get(parsed.steamId)
    if (!existing) {
      futurePlayers.push({
        steamId: parsed.steamId,
        name: parsed.name,
        skill: parsed.skill,
      })
      continue
    }

    const hasExistingSkill = existing.skill && Object.keys(existing.skill).length > 0

    if (skillsEqual(existing.skill, parsed.skill)) {
      unaffectedCount++
      continue
    }

    if (hasExistingSkill) {
      changedPlayers.push({
        steamId: existing.steamId,
        name: existing.name,
        profileUrl: makeProfileUrl(existing.steamId),
        oldSkill: existing.skill!,
        newSkill: parsed.skill,
      })
    } else {
      initializedPlayers.push({
        steamId: existing.steamId,
        name: existing.name,
        profileUrl: makeProfileUrl(existing.steamId),
        newSkill: parsed.skill,
      })
    }
  }

  return {
    changedPlayers,
    initializedPlayers,
    unaffectedCount,
    futurePlayers,
  }
}
