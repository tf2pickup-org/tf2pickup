import type { PlayerModel } from '../database/models/player.model'
import type { Tf2ClassName } from '../shared/types/tf2-class-name'

export function pluckLastEdit(
  skillHistory: NonNullable<PlayerModel['skillHistory']>,
  className: Tf2ClassName,
): {
  lastEdit: NonNullable<PlayerModel['skillHistory']>[number]
  previousValue: number | 'unknown'
} {
  for (let i = skillHistory.length - 1; i >= 1; i--) {
    const current = skillHistory[i]!
    const previous = skillHistory[i - 1]!
    if (current.skill[className] !== previous.skill[className]) {
      return {
        lastEdit: current,
        previousValue: previous.skill[className] ?? 'unknown',
      }
    }
  }

  return {
    lastEdit: skillHistory.at(-1)!,
    previousValue: 'unknown',
  }
}
