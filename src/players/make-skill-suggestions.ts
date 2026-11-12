import type { PlayerModel } from '../database/models/player.model'
import { provisionalThreshold } from '../games/calculate-elo-updates'
import { gamemodeConfigs } from '../gamemodes/configs'
import type { Gamemode } from '../shared/types/gamemode'
import type { Tf2ClassName } from '../shared/types/tf2-class-name'

interface MakeSkillSuggestionsParams {
  player: Pick<PlayerModel, 'elo' | 'stats' | 'skillHistory'>
  gamemode: Gamemode
}

const cooldownGames = 3
const thresholdHigh = 1550
const thresholdLow = 1450

export function makeSkillSuggestions({ player, gamemode }: MakeSkillSuggestionsParams) {
  const suggestions = new Map<Tf2ClassName, 'up' | 'down'>()
  const lastSkillChange = player.skillHistory?.findLast(entry => entry.gamemode === gamemode)
  for (const { name: gameClass } of gamemodeConfigs[gamemode].classes) {
    const elo = player.elo?.[gamemode]?.[gameClass]
    const gamesOnClass = player.stats.gamesByClass[gamemode]?.[gameClass] ?? 0
    if (elo === undefined || gamesOnClass < provisionalThreshold) continue
    if (lastSkillChange?.gamesByClass !== undefined) {
      const gamesAtChange = lastSkillChange.gamesByClass[gameClass] ?? 0
      if (gamesOnClass - gamesAtChange < cooldownGames) continue
    }
    if (elo > thresholdHigh) suggestions.set(gameClass, 'up')
    else if (elo < thresholdLow) suggestions.set(gameClass, 'down')
  }

  return suggestions
}
