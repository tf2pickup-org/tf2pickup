import type { PlayerModel } from '../database/models/player.model'
import { provisionalThreshold } from '../games/calculate-elo-updates'
import { getQueueConfig } from '../queue-auto/configs'
import type { Gamemode } from '../shared/types/gamemode'
import type { Tf2ClassName } from '../shared/types/tf2-class-name'
import { currentGamemode } from '../shared/current-gamemode'

interface MakeSkillSuggestionsParams {
  player: Pick<PlayerModel, 'elo' | 'stats' | 'skillHistory'>
  gamemode?: Gamemode | undefined
}

const cooldownGames = 3
const thresholdHigh = 1550
const thresholdLow = 1450

export function makeSkillSuggestions({
  player,
  gamemode = currentGamemode,
}: MakeSkillSuggestionsParams) {
  const suggestions = new Map<Tf2ClassName, 'up' | 'down'>()
  const lastSkillChange = player.skillHistory?.filter(entry => entry.gamemode === gamemode).at(-1)
  const elo = player.elo?.[gamemode]
  const gamesByClass = player.stats.gamesByClass[gamemode]
  for (const { name: gameClass } of getQueueConfig(gamemode).classes) {
    const classElo = elo?.[gameClass]
    const gamesOnClass = gamesByClass?.[gameClass] ?? 0
    if (classElo === undefined || gamesOnClass < provisionalThreshold) continue
    if (lastSkillChange?.gamesByClass !== undefined) {
      const gamesAtChange = lastSkillChange.gamesByClass[gameClass] ?? 0
      if (gamesOnClass - gamesAtChange < cooldownGames) continue
    }
    if (classElo > thresholdHigh) suggestions.set(gameClass, 'up')
    else if (classElo < thresholdLow) suggestions.set(gameClass, 'down')
  }

  return suggestions
}
