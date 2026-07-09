import type { PlayerModel } from '../database/models/player.model'
import type { Gamemode } from '../shared/types/gamemode'
import type { Tf2ClassName } from '../shared/types/tf2-class-name'

export function pluckLastEdit(
  skillHistory: NonNullable<PlayerModel['skillHistory']>,
  className: Tf2ClassName,
  gamemode: Gamemode,
): {
  lastEdit: NonNullable<PlayerModel['skillHistory']>[number]
  previousValue: number | 'unknown'
} | null {
  const history = skillHistory.filter(entry => entry.gamemode === gamemode)
  if (history.length === 0) {
    return null
  }

  for (let i = history.length - 1; i >= 1; i--) {
    const current = history[i]!
    const previous = history[i - 1]!
    if (current.skill[className] !== previous.skill[className]) {
      return {
        lastEdit: current,
        previousValue: previous.skill[className] ?? 'unknown',
      }
    }
  }

  return {
    lastEdit: history.at(-1)!,
    previousValue: 'unknown',
  }
}
