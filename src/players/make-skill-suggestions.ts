import type { PlayerModel } from '../database/models/player.model'
import { provisionalThreshold } from '../games/calculate-elo-updates'
import { queue } from '../queue-auto'
import type { Tf2ClassName } from '../shared/types/tf2-class-name'

interface MakeSkillSuggestionsParams {
  player: Pick<PlayerModel, 'elo' | 'stats' | 'skillHistory'>
}

const cooldownGames = 3
const thresholdHigh = 1550
const thresholdLow = 1450

export function makeSkillSuggestions({ player }: MakeSkillSuggestionsParams) {
  const suggestions = new Map<Tf2ClassName, 'up' | 'down'>()
  const lastSkillChange = player.skillHistory?.at(-1)
  for (const { name: gameClass } of queue.config.classes) {
    const elo = player.elo?.[gameClass]
    const gamesOnClass = player.stats.gamesByClass[gameClass] ?? 0
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
