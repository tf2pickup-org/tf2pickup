import type { PlayerModel } from '../database/models/player.model'
import type { Tf2ClassName } from '../shared/types/tf2-class-name'

export function pluckLastEdit(
  skillHistory: NonNullable<PlayerModel['skillHistory']>,
  className: Tf2ClassName,
): {
  lastEdit: NonNullable<PlayerModel['skillHistory']>[number]
  previousValue: number | 'unknown'
} {
  const lastEdit = skillHistory.at(-1)!
  const skillsForClass = skillHistory.map(s => s.skill[className]!)
  const previousValue = skillsForClass.findLast(s => s !== lastEdit.skill[className])
  return {
    lastEdit,
    previousValue: previousValue ?? 'unknown',
  }
}
